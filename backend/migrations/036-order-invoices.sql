-- Independent invoice numbering. Existing orders and payment references are preserved.
SET XACT_ABORT ON;
IF OBJECT_ID('dbo.Orders','U') IS NULL THROW 51000,'Order tables must be installed first.',1;
IF OBJECT_ID('dbo.OrderInvoiceCounter','U') IS NULL
  CREATE TABLE dbo.OrderInvoiceCounter(
    InvoiceYear int NOT NULL PRIMARY KEY,
    LastValue bigint NOT NULL CHECK(LastValue>=0)
  );
IF OBJECT_ID('dbo.OrderInvoices','U') IS NULL
  CREATE TABLE dbo.OrderInvoices(
    OrderId uniqueidentifier NOT NULL PRIMARY KEY REFERENCES dbo.Orders(OrderId),
    InvoiceNumber varchar(40) NOT NULL UNIQUE,
    InvoiceYear int NOT NULL,
    InvoiceSequence bigint NOT NULL CHECK(InvoiceSequence>0),
    IssuedAt datetime2 NOT NULL CONSTRAINT DF_OrderInvoices_IssuedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_OrderInvoices_YearSequence UNIQUE(InvoiceYear,InvoiceSequence)
  );
EXEC(N'CREATE OR ALTER PROCEDURE dbo.IssueOrderInvoice
  @order uniqueidentifier,@customer uniqueidentifier
AS
BEGIN
  SET NOCOUNT ON;
  IF @@TRANCOUNT=0 THROW 51000,''Invoice allocation requires an active transaction.'',1;
  DECLARE @status varchar(30),@payment varchar(30),@number varchar(40),@issued datetime2;
  SELECT @status=OrderStatus,@payment=PaymentStatus FROM dbo.Orders WITH(UPDLOCK,HOLDLOCK)
    WHERE OrderId=@order AND CustomerId=@customer;
  IF @status IS NULL THROW 51001,''Order not found in your account.'',1;
  IF @status<>''Delivered'' OR @payment<>''Paid''
    THROW 51002,''Your invoice is available after payment is verified and your order is delivered.'',1;
  IF NOT EXISTS(SELECT 1 FROM dbo.OrderLineItems WITH(HOLDLOCK) WHERE OrderId=@order AND FulfillmentStatus=''Delivered'')
    OR EXISTS(SELECT 1 FROM dbo.OrderLineItems WITH(HOLDLOCK) WHERE OrderId=@order AND FulfillmentStatus NOT IN (''Delivered'',''Cancelled''))
    THROW 51002,''All active items must be delivered before issuing an invoice.'',1;
  SELECT @number=InvoiceNumber,@issued=IssuedAt FROM dbo.OrderInvoices WHERE OrderId=@order;
  IF @number IS NOT NULL
  BEGIN
    SELECT @number AS number,@issued AS issuedAt;
    RETURN;
  END;
  DECLARE @year int=YEAR(DATEADD(minute,330,SYSUTCDATETIME())),@sequence bigint,@lock int;
  DECLARE @key varchar(80)=''MarryNestInvoiceNumber:''+CONVERT(varchar(4),@year);
  EXEC @lock=sys.sp_getapplock @Resource=@key,@LockMode=''Exclusive'',@LockOwner=''Transaction'',@LockTimeout=10000;
  IF @lock<0 THROW 51003,''Invoice numbering is busy. Please try again.'',1;
  IF NOT EXISTS(SELECT 1 FROM dbo.OrderInvoiceCounter WITH(UPDLOCK,HOLDLOCK) WHERE InvoiceYear=@year)
    INSERT dbo.OrderInvoiceCounter(InvoiceYear,LastValue) VALUES(@year,0);
  UPDATE dbo.OrderInvoiceCounter SET LastValue=LastValue+1 WHERE InvoiceYear=@year;
  SELECT @sequence=LastValue FROM dbo.OrderInvoiceCounter WHERE InvoiceYear=@year;
  SET @number=''NESTIN''+RIGHT(CONVERT(varchar(4),@year),2)+
    CASE WHEN @sequence<100000 THEN RIGHT(''00000''+CONVERT(varchar(20),@sequence),5) ELSE CONVERT(varchar(20),@sequence) END;
  SET @issued=SYSUTCDATETIME();
  INSERT dbo.OrderInvoices(OrderId,InvoiceNumber,InvoiceYear,InvoiceSequence,IssuedAt)
    VALUES(@order,@number,@year,@sequence,@issued);
  SELECT @number AS number,@issued AS issuedAt;
END');
