/* =========================================================
   WEDDING & EVENT MARKETPLACE
   Microsoft SQL Server
   Production-Oriented Database Schema
   ========================================================= */

CREATE DATABASE WeddingMarketplace;
GO

USE WeddingMarketplace;
GO

/* =========================================================
   1. ROLES
   ========================================================= */

CREATE TABLE Roles
(
    RoleId INT IDENTITY(1,1) NOT NULL,
    RoleCode VARCHAR(30) NOT NULL,
    RoleName NVARCHAR(100) NOT NULL,
    Description NVARCHAR(500) NULL,

    IsActive BIT NOT NULL
        CONSTRAINT DF_Roles_IsActive DEFAULT 1,

    CreatedAt DATETIME2(3) NOT NULL
        CONSTRAINT DF_Roles_CreatedAt DEFAULT SYSUTCDATETIME(),

    UpdatedAt DATETIME2(3) NOT NULL
        CONSTRAINT DF_Roles_UpdatedAt DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_Roles PRIMARY KEY (RoleId),
    CONSTRAINT UQ_Roles_RoleCode UNIQUE (RoleCode),
    CONSTRAINT UQ_Roles_RoleName UNIQUE (RoleName)
);
GO


INSERT INTO Roles
(
    RoleCode,
    RoleName,
    Description
)
VALUES
('ADMIN', 'Administrator', 'Platform administrator'),
('CUSTOMER', 'Customer', 'Customer who books wedding services'),
('VENDOR', 'Vendor', 'Service provider/vendor');
GO


/* =========================================================
   2. USERS
   ========================================================= */

CREATE TABLE Users
(
    UserId UNIQUEIDENTIFIER NOT NULL
        CONSTRAINT DF_Users_UserId DEFAULT NEWSEQUENTIALID(),

    FirstName NVARCHAR(100) NOT NULL,
    LastName NVARCHAR(100) NULL,

    Email VARCHAR(320) NOT NULL,
    PhoneNumber VARCHAR(20) NULL,

    PasswordHash NVARCHAR(500) NOT NULL,

    ProfileImageUrl NVARCHAR(1000) NULL,

    DateOfBirth DATE NULL,

    IsEmailVerified BIT NOT NULL
        CONSTRAINT DF_Users_IsEmailVerified DEFAULT 0,

    IsPhoneVerified BIT NOT NULL
        CONSTRAINT DF_Users_IsPhoneVerified DEFAULT 0,

    IsActive BIT NOT NULL
        CONSTRAINT DF_Users_IsActive DEFAULT 1,

    IsBlocked BIT NOT NULL
        CONSTRAINT DF_Users_IsBlocked DEFAULT 0,

    LastLoginAt DATETIME2(3) NULL,

    CreatedAt DATETIME2(3) NOT NULL
        CONSTRAINT DF_Users_CreatedAt DEFAULT SYSUTCDATETIME(),

    UpdatedAt DATETIME2(3) NOT NULL
        CONSTRAINT DF_Users_UpdatedAt DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_Users PRIMARY KEY (UserId),

    CONSTRAINT UQ_Users_Email UNIQUE (Email)
);
GO


/* =========================================================
   3. USER ROLES
   ========================================================= */

CREATE TABLE UserRoles
(
    UserRoleId BIGINT IDENTITY(1,1) NOT NULL,

    UserId UNIQUEIDENTIFIER NOT NULL,
    RoleId INT NOT NULL,

    IsPrimary BIT NOT NULL
        CONSTRAINT DF_UserRoles_IsPrimary DEFAULT 1,

    CreatedAt DATETIME2(3) NOT NULL
        CONSTRAINT DF_UserRoles_CreatedAt DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_UserRoles PRIMARY KEY (UserRoleId),

    CONSTRAINT FK_UserRoles_User
        FOREIGN KEY (UserId)
        REFERENCES Users(UserId),

    CONSTRAINT FK_UserRoles_Role
        FOREIGN KEY (RoleId)
        REFERENCES Roles(RoleId),

    CONSTRAINT UQ_UserRoles
        UNIQUE (UserId, RoleId)
);
GO


/* =========================================================
   4. VENDORS
   ========================================================= */

CREATE TABLE Vendors
(
    VendorId UNIQUEIDENTIFIER NOT NULL
        CONSTRAINT DF_Vendors_VendorId DEFAULT NEWSEQUENTIALID(),

    UserId UNIQUEIDENTIFIER NOT NULL,

    BusinessName NVARCHAR(200) NOT NULL,
    BusinessSlug VARCHAR(250) NOT NULL,

    BusinessDescription NVARCHAR(MAX) NULL,

    ContactEmail VARCHAR(320) NULL,
    ContactPhone VARCHAR(20) NULL,

    LogoUrl NVARCHAR(1000) NULL,
    CoverImageUrl NVARCHAR(1000) NULL,

    GSTNumber VARCHAR(50) NULL,
    PANNumber VARCHAR(20) NULL,

    VerificationStatus VARCHAR(30) NOT NULL
        CONSTRAINT DF_Vendors_VerificationStatus DEFAULT 'Pending',

    VerificationRemarks NVARCHAR(1000) NULL,

    AverageRating DECIMAL(3,2) NOT NULL
        CONSTRAINT DF_Vendors_AverageRating DEFAULT 0,

    TotalReviews INT NOT NULL
        CONSTRAINT DF_Vendors_TotalReviews DEFAULT 0,

    TotalBookings INT NOT NULL
        CONSTRAINT DF_Vendors_TotalBookings DEFAULT 0,

    IsActive BIT NOT NULL
        CONSTRAINT DF_Vendors_IsActive DEFAULT 1,

    CreatedAt DATETIME2(3) NOT NULL
        CONSTRAINT DF_Vendors_CreatedAt DEFAULT SYSUTCDATETIME(),

    UpdatedAt DATETIME2(3) NOT NULL
        CONSTRAINT DF_Vendors_UpdatedAt DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_Vendors PRIMARY KEY (VendorId),

    CONSTRAINT FK_Vendors_User
        FOREIGN KEY (UserId)
        REFERENCES Users(UserId),

    CONSTRAINT UQ_Vendors_User
        UNIQUE (UserId),

    CONSTRAINT UQ_Vendors_Slug
        UNIQUE (BusinessSlug),

    CONSTRAINT CK_Vendors_Rating
        CHECK (AverageRating BETWEEN 0 AND 5),

    CONSTRAINT CK_Vendors_Status
        CHECK
        (
            VerificationStatus IN
            (
                'Pending',
                'UnderReview',
                'Approved',
                'Rejected',
                'Suspended'
            )
        )
);
GO


/* =========================================================
   5. VENDOR DOCUMENTS
   ========================================================= */

CREATE TABLE VendorDocuments
(
    VendorDocumentId UNIQUEIDENTIFIER NOT NULL
        CONSTRAINT DF_VendorDocuments_Id DEFAULT NEWSEQUENTIALID(),

    VendorId UNIQUEIDENTIFIER NOT NULL,

    DocumentType VARCHAR(50) NOT NULL,
    DocumentNumber VARCHAR(100) NULL,

    DocumentUrl NVARCHAR(1000) NOT NULL,

    VerificationStatus VARCHAR(30) NOT NULL
        CONSTRAINT DF_VendorDocuments_Status DEFAULT 'Pending',

    VerifiedBy UNIQUEIDENTIFIER NULL,
    VerifiedAt DATETIME2(3) NULL,

    RejectionReason NVARCHAR(1000) NULL,

    CreatedAt DATETIME2(3) NOT NULL
        CONSTRAINT DF_VendorDocuments_CreatedAt DEFAULT SYSUTCDATETIME(),

    UpdatedAt DATETIME2(3) NOT NULL
        CONSTRAINT DF_VendorDocuments_UpdatedAt DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_VendorDocuments
        PRIMARY KEY (VendorDocumentId),

    CONSTRAINT FK_VendorDocuments_Vendor
        FOREIGN KEY (VendorId)
        REFERENCES Vendors(VendorId),

    CONSTRAINT FK_VendorDocuments_VerifiedBy
        FOREIGN KEY (VerifiedBy)
        REFERENCES Users(UserId),

    CONSTRAINT CK_VendorDocuments_Status
        CHECK
        (
            VerificationStatus IN
            (
                'Pending',
                'Approved',
                'Rejected'
            )
        )
);
GO


/* =========================================================
   6. CATEGORIES
   ========================================================= */

CREATE TABLE Categories
(
    CategoryId INT IDENTITY(1,1) NOT NULL,

    CategoryCode VARCHAR(50) NOT NULL,
    CategoryName NVARCHAR(150) NOT NULL,

    Description NVARCHAR(500) NULL,

    IconName VARCHAR(100) NULL,

    SortOrder INT NOT NULL
        CONSTRAINT DF_Categories_SortOrder DEFAULT 0,

    IsActive BIT NOT NULL
        CONSTRAINT DF_Categories_IsActive DEFAULT 1,

    CreatedAt DATETIME2(3) NOT NULL
        CONSTRAINT DF_Categories_CreatedAt DEFAULT SYSUTCDATETIME(),

    UpdatedAt DATETIME2(3) NOT NULL
        CONSTRAINT DF_Categories_UpdatedAt DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_Categories PRIMARY KEY (CategoryId),

    CONSTRAINT UQ_Categories_Code UNIQUE (CategoryCode),

    CONSTRAINT UQ_Categories_Name UNIQUE (CategoryName)
);
GO


CREATE TABLE SubCategories
(
    SubCategoryId INT IDENTITY(1,1) NOT NULL,

    CategoryId INT NOT NULL,

    SubCategoryCode VARCHAR(50) NOT NULL,
    SubCategoryName NVARCHAR(150) NOT NULL,

    Description NVARCHAR(500) NULL,

    SortOrder INT NOT NULL DEFAULT 0,

    IsActive BIT NOT NULL DEFAULT 1,

    CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),

    UpdatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_SubCategories
        PRIMARY KEY (SubCategoryId),

    CONSTRAINT FK_SubCategories_Category
        FOREIGN KEY (CategoryId)
        REFERENCES Categories(CategoryId),

    CONSTRAINT UQ_SubCategories_Code
        UNIQUE (CategoryId, SubCategoryCode),

    CONSTRAINT UQ_SubCategories_Name
        UNIQUE (CategoryId, SubCategoryName)
);
GO


/* =========================================================
   8. VENDOR CATEGORIES
   ========================================================= */

CREATE TABLE VendorCategories
(
    VendorCategoryId BIGINT IDENTITY(1,1) NOT NULL,

    VendorId UNIQUEIDENTIFIER NOT NULL,
    CategoryId INT NOT NULL,

    IsPrimary BIT NOT NULL DEFAULT 0,

    CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_VendorCategories
        PRIMARY KEY (VendorCategoryId),

    CONSTRAINT FK_VendorCategories_Vendor
        FOREIGN KEY (VendorId)
        REFERENCES Vendors(VendorId),

    CONSTRAINT FK_VendorCategories_Category
        FOREIGN KEY (CategoryId)
        REFERENCES Categories(CategoryId),

    CONSTRAINT UQ_VendorCategories
        UNIQUE (VendorId, CategoryId)
);
GO


/* =========================================================
   9. VENDOR LOCATIONS
   ========================================================= */

CREATE TABLE VendorLocations
(
    VendorLocationId UNIQUEIDENTIFIER NOT NULL
        CONSTRAINT DF_VendorLocations_Id DEFAULT NEWSEQUENTIALID(),

    VendorId UNIQUEIDENTIFIER NOT NULL,

    AddressLine1 NVARCHAR(300) NOT NULL,
    AddressLine2 NVARCHAR(300) NULL,
    Landmark NVARCHAR(200) NULL,

    City NVARCHAR(100) NOT NULL,
    State NVARCHAR(100) NOT NULL,
    Country NVARCHAR(100) NOT NULL DEFAULT 'India',

    PostalCode VARCHAR(20) NULL,

    Latitude DECIMAL(10,7) NULL,
    Longitude DECIMAL(10,7) NULL,

    IsPrimary BIT NOT NULL DEFAULT 1,
    IsActive BIT NOT NULL DEFAULT 1,

    CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_VendorLocations
        PRIMARY KEY (VendorLocationId),

    CONSTRAINT FK_VendorLocations_Vendor
        FOREIGN KEY (VendorId)
        REFERENCES Vendors(VendorId)
);
GO


/* =========================================================
   10. SERVICES
   ========================================================= */

CREATE TABLE Services
(
    ServiceId UNIQUEIDENTIFIER NOT NULL
        CONSTRAINT DF_Services_Id DEFAULT NEWSEQUENTIALID(),

    VendorId UNIQUEIDENTIFIER NOT NULL,
    CategoryId INT NOT NULL,
    SubCategoryId INT NULL,

    ServiceName NVARCHAR(200) NOT NULL,
    ServiceSlug VARCHAR(250) NOT NULL,

    Description NVARCHAR(MAX) NULL,

    PricingType VARCHAR(30) NOT NULL DEFAULT 'Fixed',

    BasePrice DECIMAL(18,2) NULL,
    MinimumPrice DECIMAL(18,2) NULL,
    MaximumPrice DECIMAL(18,2) NULL,

    MinimumGuests INT NULL,
    MaximumGuests INT NULL,

    DurationMinutes INT NULL,

    IsCustomQuoteAvailable BIT NOT NULL DEFAULT 0,

    ApprovalStatus VARCHAR(30) NOT NULL DEFAULT 'Pending',

    IsActive BIT NOT NULL DEFAULT 1,

    CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_Services
        PRIMARY KEY (ServiceId),

    CONSTRAINT FK_Services_Vendor
        FOREIGN KEY (VendorId)
        REFERENCES Vendors(VendorId),

    CONSTRAINT FK_Services_Category
        FOREIGN KEY (CategoryId)
        REFERENCES Categories(CategoryId),

    CONSTRAINT FK_Services_SubCategory
        FOREIGN KEY (SubCategoryId)
        REFERENCES SubCategories(SubCategoryId),

    CONSTRAINT UQ_Services_Slug
        UNIQUE (ServiceSlug),

    CONSTRAINT CK_Services_PricingType
        CHECK
        (
            PricingType IN
            (
                'Fixed',
                'PerPerson',
                'PerHour',
                'PerDay',
                'PerItem',
                'CustomQuote'
            )
        ),

    CONSTRAINT CK_Services_ApprovalStatus
        CHECK
        (
            ApprovalStatus IN
            (
                'Pending',
                'Approved',
                'Rejected',
                'Suspended'
            )
        ),

    CONSTRAINT CK_Services_Price
        CHECK
        (
            BasePrice IS NULL OR BasePrice >= 0
        )
);
GO


/* =========================================================
   11. SERVICE ITEMS
   ========================================================= */

CREATE TABLE ServiceItems
(
    ServiceItemId BIGINT IDENTITY(1,1) NOT NULL,

    ServiceId UNIQUEIDENTIFIER NOT NULL,

    ItemName NVARCHAR(200) NOT NULL,
    Description NVARCHAR(500) NULL,

    Quantity DECIMAL(18,3) NULL,
    Unit NVARCHAR(50) NULL,

    UnitPrice DECIMAL(18,2) NULL,

    IsIncluded BIT NOT NULL DEFAULT 1,

    SortOrder INT NOT NULL DEFAULT 0,

    CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_ServiceItems
        PRIMARY KEY (ServiceItemId),

    CONSTRAINT FK_ServiceItems_Service
        FOREIGN KEY (ServiceId)
        REFERENCES Services(ServiceId)
);
GO


/* =========================================================
   12. SERVICE PACKAGES
   ========================================================= */

CREATE TABLE ServicePackages
(
    PackageId UNIQUEIDENTIFIER NOT NULL
        CONSTRAINT DF_ServicePackages_Id DEFAULT NEWSEQUENTIALID(),

    ServiceId UNIQUEIDENTIFIER NOT NULL,

    PackageName NVARCHAR(200) NOT NULL,
    Description NVARCHAR(MAX) NULL,

    Price DECIMAL(18,2) NOT NULL,

    DiscountPercentage DECIMAL(5,2) NOT NULL DEFAULT 0,

    FinalPrice AS
    (
        Price - (Price * DiscountPercentage / 100)
    ) PERSISTED,

    MinimumGuests INT NULL,
    MaximumGuests INT NULL,

    DurationMinutes INT NULL,

    IsFeatured BIT NOT NULL DEFAULT 0,
    IsActive BIT NOT NULL DEFAULT 1,

    CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_ServicePackages
        PRIMARY KEY (PackageId),

    CONSTRAINT FK_ServicePackages_Service
        FOREIGN KEY (ServiceId)
        REFERENCES Services(ServiceId),

    CONSTRAINT CK_ServicePackages_Price
        CHECK (Price >= 0),

    CONSTRAINT CK_ServicePackages_Discount
        CHECK (DiscountPercentage BETWEEN 0 AND 100)
);
GO


/* =========================================================
   13. PACKAGE ITEMS
   ========================================================= */

CREATE TABLE PackageItems
(
    PackageItemId BIGINT IDENTITY(1,1) NOT NULL,

    PackageId UNIQUEIDENTIFIER NOT NULL,

    ItemName NVARCHAR(200) NOT NULL,
    Description NVARCHAR(500) NULL,

    Quantity DECIMAL(18,3) NULL,
    Unit NVARCHAR(50) NULL,

    SortOrder INT NOT NULL DEFAULT 0,

    CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_PackageItems
        PRIMARY KEY (PackageItemId),

    CONSTRAINT FK_PackageItems_Package
        FOREIGN KEY (PackageId)
        REFERENCES ServicePackages(PackageId)
);
GO


CREATE TABLE Events
(
    EventId UNIQUEIDENTIFIER NOT NULL
        CONSTRAINT DF_Events_Id DEFAULT NEWSEQUENTIALID(),

    CustomerId UNIQUEIDENTIFIER NOT NULL,

    EventName NVARCHAR(200) NOT NULL,

    EventType VARCHAR(50) NOT NULL,

    EventDate DATE NOT NULL,

    StartTime TIME(0) NULL,
    EndTime TIME(0) NULL,

    GuestCount INT NULL,

    Budget DECIMAL(18,2) NULL,

    Description NVARCHAR(MAX) NULL,

    City NVARCHAR(100) NULL,
    State NVARCHAR(100) NULL,

    Status VARCHAR(30) NOT NULL DEFAULT 'Planning',

    CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_Events PRIMARY KEY (EventId),

    CONSTRAINT FK_Events_Customer
        FOREIGN KEY (CustomerId)
        REFERENCES Users(UserId),

    CONSTRAINT CK_Events_Status
        CHECK
        (
            Status IN
            (
                'Planning',
                'Confirmed',
                'Completed',
                'Cancelled'
            )
        )
);
GO



/* =========================================================
   33. VENDOR AVAILABILITY
   ========================================================= */

CREATE TABLE VendorAvailability
(
    AvailabilityId BIGINT IDENTITY(1,1) NOT NULL,

    VendorId UNIQUEIDENTIFIER NOT NULL,
    ServiceId UNIQUEIDENTIFIER NULL,

    AvailableDate DATE NOT NULL,

    StartTime TIME(0) NULL,
    EndTime TIME(0) NULL,

    Status VARCHAR(20) NOT NULL DEFAULT 'Available',

    Notes NVARCHAR(500) NULL,

    CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_VendorAvailability
        PRIMARY KEY (AvailabilityId),

    CONSTRAINT FK_VendorAvailability_Vendor
        FOREIGN KEY (VendorId)
        REFERENCES Vendors(VendorId),

    CONSTRAINT FK_VendorAvailability_Service
        FOREIGN KEY (ServiceId)
        REFERENCES Services(ServiceId),

    CONSTRAINT CK_VendorAvailability_Status
        CHECK
        (
            Status IN
            (
                'Available',
                'Blocked',
                'Booked'
            )
        )
);
GO


/* =========================================================
   34. BOOKINGS
   ========================================================= */

CREATE TABLE Booking
(
    BookingId UNIQUEIDENTIFIER NOT NULL
        CONSTRAINT DF_Booking_Id DEFAULT NEWSEQUENTIALID(),

    BookingNumber VARCHAR(40) NOT NULL,

    EventId UNIQUEIDENTIFIER NOT NULL,

    CustomerId UNIQUEIDENTIFIER NOT NULL,
    VendorId UNIQUEIDENTIFIER NOT NULL,

    BookingDate DATE NOT NULL,

    SubTotal DECIMAL(18,2) NOT NULL DEFAULT 0,
    DiscountAmount DECIMAL(18,2) NOT NULL DEFAULT 0,
    TaxAmount DECIMAL(18,2) NOT NULL DEFAULT 0,
    PlatformFee DECIMAL(18,2) NOT NULL DEFAULT 0,

    TotalAmount AS
    (
        SubTotal
        - DiscountAmount
        + TaxAmount
        + PlatformFee
    ) PERSISTED,

    AdvanceAmount DECIMAL(18,2) NOT NULL DEFAULT 0,

    PaidAmount DECIMAL(18,2) NOT NULL DEFAULT 0,

    RemainingAmount AS
    (
        (
            SubTotal
            - DiscountAmount
            + TaxAmount
            + PlatformFee
        ) - PaidAmount
    ) PERSISTED,

    BookingStatus VARCHAR(30) NOT NULL DEFAULT 'Pending',

    PaymentStatus VARCHAR(30) NOT NULL DEFAULT 'Pending',

    CustomerNotes NVARCHAR(MAX) NULL,
    VendorNotes NVARCHAR(MAX) NULL,

    CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_Booking PRIMARY KEY (BookingId),

    CONSTRAINT UQ_Booking_Number
        UNIQUE (BookingNumber),

    CONSTRAINT FK_Booking_Event
        FOREIGN KEY (EventId)
        REFERENCES Events(EventId),

    CONSTRAINT FK_Booking_Customer
        FOREIGN KEY (CustomerId)
        REFERENCES Users(UserId),

    CONSTRAINT FK_Booking_Vendor
        FOREIGN KEY (VendorId)
        REFERENCES Vendors(VendorId),

    CONSTRAINT CK_Booking_Status
        CHECK
        (
            BookingStatus IN
            (
                'Pending',
                'Accepted',
                'Rejected',
                'PaymentPending',
                'Confirmed',
                'InProgress',
                'Completed',
                'Cancelled',
                'Disputed',
                'Refunded'
            )
        ),

    CONSTRAINT CK_Booking_PaymentStatus
        CHECK
        (
            PaymentStatus IN
            (
                'Pending',
                'PartiallyPaid',
                'Paid',
                'Failed',
                'RefundPending',
                'Refunded'
            )
        )
);
GO


/* =========================================================
   35. BOOKING ITEMS
   ========================================================= */

CREATE TABLE BookingItems
(
    BookingItemId BIGINT IDENTITY(1,1) NOT NULL,

    BookingId UNIQUEIDENTIFIER NOT NULL,

    ServiceId UNIQUEIDENTIFIER NOT NULL,
    PackageId UNIQUEIDENTIFIER NULL,

    ItemName NVARCHAR(200) NOT NULL,

    Quantity DECIMAL(18,3) NOT NULL DEFAULT 1,

    UnitPrice DECIMAL(18,2) NOT NULL,

    DiscountAmount DECIMAL(18,2) NOT NULL DEFAULT 0,

    TaxAmount DECIMAL(18,2) NOT NULL DEFAULT 0,

    LineTotal AS
    (
        (Quantity * UnitPrice)
        - DiscountAmount
        + TaxAmount
    ) PERSISTED,

    CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_BookingItems
        PRIMARY KEY (BookingItemId),

    CONSTRAINT FK_BookingItems_Booking
        FOREIGN KEY (BookingId)
        REFERENCES Booking(BookingId),

    CONSTRAINT FK_BookingItems_Service
        FOREIGN KEY (ServiceId)
        REFERENCES Services(ServiceId),

    CONSTRAINT FK_BookingItems_Package
        FOREIGN KEY (PackageId)
        REFERENCES ServicePackages(PackageId)
);
GO


/* =========================================================
   36. BOOKING STATUS HISTORY
   ========================================================= */

CREATE TABLE BookingStatusHistory
(
    BookingStatusHistoryId BIGINT IDENTITY(1,1) NOT NULL,

    BookingId UNIQUEIDENTIFIER NOT NULL,

    OldStatus VARCHAR(30) NULL,
    NewStatus VARCHAR(30) NOT NULL,

    ChangedBy UNIQUEIDENTIFIER NULL,

    Remarks NVARCHAR(1000) NULL,

    CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_BookingStatusHistory
        PRIMARY KEY (BookingStatusHistoryId),

    CONSTRAINT FK_BookingStatusHistory_Booking
        FOREIGN KEY (BookingId)
        REFERENCES Booking(BookingId),

    CONSTRAINT FK_BookingStatusHistory_User
        FOREIGN KEY (ChangedBy)
        REFERENCES Users(UserId)
);
GO


/* =========================================================
   37. QUOTATIONS
   ========================================================= */

CREATE TABLE Quotations
(
    QuotationId UNIQUEIDENTIFIER NOT NULL
        CONSTRAINT DF_Quotations_Id DEFAULT NEWSEQUENTIALID(),

    QuotationNumber VARCHAR(40) NOT NULL,

    EventId UNIQUEIDENTIFIER NOT NULL,

    CustomerId UNIQUEIDENTIFIER NOT NULL,
    VendorId UNIQUEIDENTIFIER NOT NULL,

    ValidUntil DATETIME2(3) NULL,

    SubTotal DECIMAL(18,2) NOT NULL DEFAULT 0,
    DiscountAmount DECIMAL(18,2) NOT NULL DEFAULT 0,
    TaxAmount DECIMAL(18,2) NOT NULL DEFAULT 0,

    TotalAmount AS
    (
        SubTotal
        - DiscountAmount
        + TaxAmount
    ) PERSISTED,

    Status VARCHAR(30) NOT NULL DEFAULT 'Draft',

    CustomerMessage NVARCHAR(MAX) NULL,
    VendorMessage NVARCHAR(MAX) NULL,

    CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_Quotations
        PRIMARY KEY (QuotationId),

    CONSTRAINT UQ_Quotations_Number
        UNIQUE (QuotationNumber),

    CONSTRAINT FK_Quotations_Event
        FOREIGN KEY (EventId)
        REFERENCES Events(EventId),

    CONSTRAINT FK_Quotations_Customer
        FOREIGN KEY (CustomerId)
        REFERENCES Users(UserId),

    CONSTRAINT FK_Quotations_Vendor
        FOREIGN KEY (VendorId)
        REFERENCES Vendors(VendorId),

    CONSTRAINT CK_Quotations_Status
        CHECK
        (
            Status IN
            (
                'Draft',
                'Sent',
                'Viewed',
                'Accepted',
                'Rejected',
                'Expired',
                'Cancelled'
            )
        )
);
GO


/* =========================================================
   38. QUOTATION ITEMS
   ========================================================= */

CREATE TABLE QuotationItems
(
    QuotationItemId BIGINT IDENTITY(1,1) NOT NULL,

    QuotationId UNIQUEIDENTIFIER NOT NULL,

    ServiceId UNIQUEIDENTIFIER NULL,
    PackageId UNIQUEIDENTIFIER NULL,

    ItemName NVARCHAR(200) NOT NULL,

    Description NVARCHAR(1000) NULL,

    Quantity DECIMAL(18,3) NOT NULL DEFAULT 1,

    UnitPrice DECIMAL(18,2) NOT NULL,

    DiscountAmount DECIMAL(18,2) NOT NULL DEFAULT 0,

    TaxAmount DECIMAL(18,2) NOT NULL DEFAULT 0,

    LineTotal AS
    (
        (Quantity * UnitPrice)
        - DiscountAmount
        + TaxAmount
    ) PERSISTED,

    CONSTRAINT PK_QuotationItems
        PRIMARY KEY (QuotationItemId),

    CONSTRAINT FK_QuotationItems_Quotation
        FOREIGN KEY (QuotationId)
        REFERENCES Quotations(QuotationId),

    CONSTRAINT FK_QuotationItems_Service
        FOREIGN KEY (ServiceId)
        REFERENCES Services(ServiceId),

    CONSTRAINT FK_QuotationItems_Package
        FOREIGN KEY (PackageId)
        REFERENCES ServicePackages(PackageId)
);
GO

/* =========================================================
   39. PAYMENTS
   ========================================================= */

CREATE TABLE Payments
(
    PaymentId UNIQUEIDENTIFIER NOT NULL
        CONSTRAINT DF_Payments_Id DEFAULT NEWSEQUENTIALID(),

    BookingId UNIQUEIDENTIFIER NOT NULL,

    PaymentReference VARCHAR(100) NOT NULL,

    GatewayName VARCHAR(50) NULL,
    GatewayTransactionId VARCHAR(200) NULL,

    PaymentMethod VARCHAR(30) NOT NULL,

    Amount DECIMAL(18,2) NOT NULL,

    Currency CHAR(3) NOT NULL DEFAULT 'INR',

    PaymentStatus VARCHAR(30) NOT NULL DEFAULT 'Pending',

    PaidAt DATETIME2(3) NULL,

    GatewayResponse NVARCHAR(MAX) NULL,

    CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_Payments
        PRIMARY KEY (PaymentId),

    CONSTRAINT UQ_Payments_Reference
        UNIQUE (PaymentReference),

    CONSTRAINT FK_Payments_Booking
        FOREIGN KEY (BookingId)
        REFERENCES Booking(BookingId),

    CONSTRAINT CK_Payments_Status
        CHECK
        (
            PaymentStatus IN
            (
                'Pending',
                'Processing',
                'Success',
                'Failed',
                'Refunded'
            )
        )
);
GO


/* =========================================================
   40. PAYMENT TRANSACTIONS
   ========================================================= */

CREATE TABLE PaymentTransactions
(
    TransactionId UNIQUEIDENTIFIER NOT NULL
        CONSTRAINT DF_PaymentTransactions_Id DEFAULT NEWSEQUENTIALID(),

    PaymentId UNIQUEIDENTIFIER NOT NULL,

    TransactionType VARCHAR(30) NOT NULL,

    Amount DECIMAL(18,2) NOT NULL,

    TransactionStatus VARCHAR(30) NOT NULL,

    GatewayTransactionId VARCHAR(200) NULL,

    TransactionData NVARCHAR(MAX) NULL,

    CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_PaymentTransactions
        PRIMARY KEY (TransactionId),

    CONSTRAINT FK_PaymentTransactions_Payment
        FOREIGN KEY (PaymentId)
        REFERENCES Payments(PaymentId)
);
GO


/* =========================================================
   41. REFUNDS
   ========================================================= */

CREATE TABLE Refunds
(
    RefundId UNIQUEIDENTIFIER NOT NULL
        CONSTRAINT DF_Refunds_Id DEFAULT NEWSEQUENTIALID(),

    PaymentId UNIQUEIDENTIFIER NOT NULL,
    BookingId UNIQUEIDENTIFIER NOT NULL,

    RefundReference VARCHAR(100) NOT NULL,

    RefundAmount DECIMAL(18,2) NOT NULL,

    Reason NVARCHAR(1000) NULL,

    RefundStatus VARCHAR(30) NOT NULL DEFAULT 'Pending',

    GatewayRefundId VARCHAR(200) NULL,

    ProcessedAt DATETIME2(3) NULL,

    CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_Refunds PRIMARY KEY (RefundId),

    CONSTRAINT UQ_Refunds_Reference
        UNIQUE (RefundReference),

    CONSTRAINT FK_Refunds_Payment
        FOREIGN KEY (PaymentId)
        REFERENCES Payments(PaymentId),

    CONSTRAINT FK_Refunds_Booking
        FOREIGN KEY (BookingId)
        REFERENCES Booking(BookingId)
);
GO


/* =========================================================
   42. VENDOR PAYOUTS
   ========================================================= */

CREATE TABLE VendorPayouts
(
    PayoutId UNIQUEIDENTIFIER NOT NULL
        CONSTRAINT DF_VendorPayouts_Id DEFAULT NEWSEQUENTIALID(),

    VendorId UNIQUEIDENTIFIER NOT NULL,
    BookingId UNIQUEIDENTIFIER NOT NULL,

    GrossAmount DECIMAL(18,2) NOT NULL,

    PlatformCommission DECIMAL(18,2) NOT NULL DEFAULT 0,

    TaxDeduction DECIMAL(18,2) NOT NULL DEFAULT 0,

    NetAmount AS
    (
        GrossAmount
        - PlatformCommission
        - TaxDeduction
    ) PERSISTED,

    PayoutStatus VARCHAR(30) NOT NULL DEFAULT 'Pending',

    PaidAt DATETIME2(3) NULL,

    CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_VendorPayouts
        PRIMARY KEY (PayoutId),

    CONSTRAINT FK_VendorPayouts_Vendor
        FOREIGN KEY (VendorId)
        REFERENCES Vendors(VendorId),

    CONSTRAINT FK_VendorPayouts_Booking
        FOREIGN KEY (BookingId)
        REFERENCES Booking(BookingId)
);
GO


/* =========================================================
   43. PLATFORM COMMISSION
   ========================================================= */

CREATE TABLE PlatformCommission
(
    CommissionId UNIQUEIDENTIFIER NOT NULL
        CONSTRAINT DF_PlatformCommission_Id DEFAULT NEWSEQUENTIALID(),

    BookingId UNIQUEIDENTIFIER NOT NULL,
    VendorId UNIQUEIDENTIFIER NOT NULL,

    CommissionType VARCHAR(30) NOT NULL DEFAULT 'Percentage',

    CommissionRate DECIMAL(8,4) NOT NULL DEFAULT 0,

    BookingAmount DECIMAL(18,2) NOT NULL,

    CommissionAmount DECIMAL(18,2) NOT NULL,

    CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_PlatformCommission
        PRIMARY KEY (CommissionId),

    CONSTRAINT FK_PlatformCommission_Booking
        FOREIGN KEY (BookingId)
        REFERENCES Booking(BookingId),

    CONSTRAINT FK_PlatformCommission_Vendor
        FOREIGN KEY (VendorId)
        REFERENCES Vendors(VendorId)
);
GO

/* =========================================================
   44. REVIEWS
   ========================================================= */

CREATE TABLE Reviews
(
    ReviewId UNIQUEIDENTIFIER NOT NULL
        CONSTRAINT DF_Reviews_Id DEFAULT NEWSEQUENTIALID(),

    BookingId UNIQUEIDENTIFIER NOT NULL,

    CustomerId UNIQUEIDENTIFIER NOT NULL,
    VendorId UNIQUEIDENTIFIER NOT NULL,

    Rating TINYINT NOT NULL,

    ReviewTitle NVARCHAR(200) NULL,
    ReviewText NVARCHAR(MAX) NULL,

    IsVerified BIT NOT NULL DEFAULT 1,
    IsPublished BIT NOT NULL DEFAULT 1,

    CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_Reviews PRIMARY KEY (ReviewId),

    CONSTRAINT FK_Reviews_Booking
        FOREIGN KEY (BookingId)
        REFERENCES Booking(BookingId),

    CONSTRAINT FK_Reviews_Customer
        FOREIGN KEY (CustomerId)
        REFERENCES Users(UserId),

    CONSTRAINT FK_Reviews_Vendor
        FOREIGN KEY (VendorId)
        REFERENCES Vendors(VendorId),

    CONSTRAINT CK_Reviews_Rating
        CHECK (Rating BETWEEN 1 AND 5),

    CONSTRAINT UQ_Reviews_Booking
        UNIQUE (BookingId)
);
GO


/* =========================================================
   45. REVIEW IMAGES
   ========================================================= */

CREATE TABLE ReviewImages
(
    ReviewImageId UNIQUEIDENTIFIER NOT NULL
        CONSTRAINT DF_ReviewImages_Id DEFAULT NEWSEQUENTIALID(),

    ReviewId UNIQUEIDENTIFIER NOT NULL,

    ImageUrl NVARCHAR(1000) NOT NULL,

    SortOrder INT NOT NULL DEFAULT 0,

    CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_ReviewImages
        PRIMARY KEY (ReviewImageId),

    CONSTRAINT FK_ReviewImages_Review
        FOREIGN KEY (ReviewId)
        REFERENCES Reviews(ReviewId)
);
GO


/* =========================================================
   46. WISHLISTS
   ========================================================= */

CREATE TABLE Wishlists
(
    WishlistId BIGINT IDENTITY(1,1) NOT NULL,

    CustomerId UNIQUEIDENTIFIER NOT NULL,

    VendorId UNIQUEIDENTIFIER NULL,
    ServiceId UNIQUEIDENTIFIER NULL,

    CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_Wishlists
        PRIMARY KEY (WishlistId),

    CONSTRAINT FK_Wishlists_Customer
        FOREIGN KEY (CustomerId)
        REFERENCES Users(UserId),

    CONSTRAINT FK_Wishlists_Vendor
        FOREIGN KEY (VendorId)
        REFERENCES Vendors(VendorId),

    CONSTRAINT FK_Wishlists_Service
        FOREIGN KEY (ServiceId)
        REFERENCES Services(ServiceId),

    CONSTRAINT CK_Wishlists_Target
        CHECK
        (
            VendorId IS NOT NULL OR ServiceId IS NOT NULL
        )
);
GO

/* =========================================================
   47. CONVERSATIONS
   ========================================================= */

CREATE TABLE Conversations
(
    ConversationId UNIQUEIDENTIFIER NOT NULL
        CONSTRAINT DF_Conversations_Id DEFAULT NEWSEQUENTIALID(),

    CustomerId UNIQUEIDENTIFIER NOT NULL,
    VendorId UNIQUEIDENTIFIER NOT NULL,

    BookingId UNIQUEIDENTIFIER NULL,

    LastMessageAt DATETIME2(3) NULL,

    IsActive BIT NOT NULL DEFAULT 1,

    CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_Conversations
        PRIMARY KEY (ConversationId),

    CONSTRAINT FK_Conversations_Customer
        FOREIGN KEY (CustomerId)
        REFERENCES Users(UserId),

    CONSTRAINT FK_Conversations_Vendor
        FOREIGN KEY (VendorId)
        REFERENCES Vendors(VendorId),

    CONSTRAINT FK_Conversations_Booking
        FOREIGN KEY (BookingId)
        REFERENCES Booking(BookingId)
);
GO


/* =========================================================
   48. MESSAGES
   ========================================================= */

CREATE TABLE Messages
(
    MessageId UNIQUEIDENTIFIER NOT NULL
        CONSTRAINT DF_Messages_Id DEFAULT NEWSEQUENTIALID(),

    ConversationId UNIQUEIDENTIFIER NOT NULL,

    SenderUserId UNIQUEIDENTIFIER NOT NULL,

    MessageType VARCHAR(30) NOT NULL DEFAULT 'Text',

    MessageText NVARCHAR(MAX) NULL,

    AttachmentUrl NVARCHAR(1000) NULL,

    IsRead BIT NOT NULL DEFAULT 0,

    CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_Messages
        PRIMARY KEY (MessageId),

    CONSTRAINT FK_Messages_Conversation
        FOREIGN KEY (ConversationId)
        REFERENCES Conversations(ConversationId),

    CONSTRAINT FK_Messages_Sender
        FOREIGN KEY (SenderUserId)
        REFERENCES Users(UserId)
);
GO


/* =========================================================
   49. NOTIFICATIONS
   ========================================================= */

CREATE TABLE Notifications
(
    NotificationId UNIQUEIDENTIFIER NOT NULL
        CONSTRAINT DF_Notifications_Id DEFAULT NEWSEQUENTIALID(),

    UserId UNIQUEIDENTIFIER NOT NULL,

    NotificationType VARCHAR(50) NOT NULL,

    Title NVARCHAR(200) NOT NULL,

    Message NVARCHAR(2000) NOT NULL,

    ReferenceType VARCHAR(50) NULL,
    ReferenceId UNIQUEIDENTIFIER NULL,

    IsRead BIT NOT NULL DEFAULT 0,

    ReadAt DATETIME2(3) NULL,

    CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_Notifications
        PRIMARY KEY (NotificationId),

    CONSTRAINT FK_Notifications_User
        FOREIGN KEY (UserId)
        REFERENCES Users(UserId)
);
GO

/* =========================================================
   50. COUPONS
   ========================================================= */

CREATE TABLE Coupons
(
    CouponId UNIQUEIDENTIFIER NOT NULL
        CONSTRAINT DF_Coupons_Id DEFAULT NEWSEQUENTIALID(),

    CouponCode VARCHAR(50) NOT NULL,

    Description NVARCHAR(500) NULL,

    DiscountType VARCHAR(30) NOT NULL,

    DiscountValue DECIMAL(18,2) NOT NULL,

    MinimumBookingAmount DECIMAL(18,2) NULL,
    MaximumDiscountAmount DECIMAL(18,2) NULL,

    UsageLimit INT NULL,
    UsedCount INT NOT NULL DEFAULT 0,

    StartDate DATETIME2(3) NOT NULL,
    EndDate DATETIME2(3) NOT NULL,

    IsActive BIT NOT NULL DEFAULT 1,

    CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_Coupons PRIMARY KEY (CouponId),

    CONSTRAINT UQ_Coupons_Code UNIQUE (CouponCode),

    CONSTRAINT CK_Coupons_DiscountType
        CHECK
        (
            DiscountType IN
            (
                'Percentage',
                'Fixed'
            )
        ),

    CONSTRAINT CK_Coupons_Dates
        CHECK (EndDate > StartDate)
);
GO


/* =========================================================
   51. OFFERS
   ========================================================= */

CREATE TABLE Offers
(
    OfferId UNIQUEIDENTIFIER NOT NULL
        CONSTRAINT DF_Offers_Id DEFAULT NEWSEQUENTIALID(),

    VendorId UNIQUEIDENTIFIER NULL,
    ServiceId UNIQUEIDENTIFIER NULL,

    OfferName NVARCHAR(200) NOT NULL,

    Description NVARCHAR(1000) NULL,

    DiscountType VARCHAR(30) NOT NULL,

    DiscountValue DECIMAL(18,2) NOT NULL,

    MinimumAmount DECIMAL(18,2) NULL,
    MaximumDiscountAmount DECIMAL(18,2) NULL,

    StartDate DATETIME2(3) NOT NULL,
    EndDate DATETIME2(3) NOT NULL,

    IsActive BIT NOT NULL DEFAULT 1,

    CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_Offers PRIMARY KEY (OfferId),

    CONSTRAINT FK_Offers_Vendor
        FOREIGN KEY (VendorId)
        REFERENCES Vendors(VendorId),

    CONSTRAINT FK_Offers_Service
        FOREIGN KEY (ServiceId)
        REFERENCES Services(ServiceId),

    CONSTRAINT CK_Offers_DiscountType
        CHECK
        (
            DiscountType IN
            (
                'Percentage',
                'Fixed'
            )
        ),

    CONSTRAINT CK_Offers_Dates
        CHECK (EndDate > StartDate)
);
GO

/* =========================================================
   52. ADDRESSES
   ========================================================= */

CREATE TABLE Addresses
(
    AddressId UNIQUEIDENTIFIER NOT NULL
        CONSTRAINT DF_Addresses_Id DEFAULT NEWSEQUENTIALID(),

    UserId UNIQUEIDENTIFIER NOT NULL,

    AddressType VARCHAR(30) NOT NULL DEFAULT 'Other',

    AddressLine1 NVARCHAR(300) NOT NULL,
    AddressLine2 NVARCHAR(300) NULL,

    Landmark NVARCHAR(200) NULL,

    City NVARCHAR(100) NOT NULL,
    State NVARCHAR(100) NOT NULL,
    Country NVARCHAR(100) NOT NULL DEFAULT 'India',

    PostalCode VARCHAR(20) NULL,

    Latitude DECIMAL(10,7) NULL,
    Longitude DECIMAL(10,7) NULL,

    IsDefault BIT NOT NULL DEFAULT 0,

    CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_Addresses PRIMARY KEY (AddressId),

    CONSTRAINT FK_Addresses_User
        FOREIGN KEY (UserId)
        REFERENCES Users(UserId)
);
GO


/* =========================================================
   53. MEDIA
   ========================================================= */

CREATE TABLE Media
(
    MediaId UNIQUEIDENTIFIER NOT NULL
        CONSTRAINT DF_Media_Id DEFAULT NEWSEQUENTIALID(),

    EntityType VARCHAR(50) NOT NULL,
    EntityId UNIQUEIDENTIFIER NOT NULL,

    MediaType VARCHAR(20) NOT NULL,

    MediaUrl NVARCHAR(1000) NOT NULL,

    PublicId NVARCHAR(500) NULL,

    FileName NVARCHAR(255) NULL,

    MimeType VARCHAR(100) NULL,

    FileSize BIGINT NULL,

    SortOrder INT NOT NULL DEFAULT 0,

    IsPrimary BIT NOT NULL DEFAULT 0,

    CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_Media PRIMARY KEY (MediaId),

    CONSTRAINT CK_Media_Type
        CHECK
        (
            MediaType IN
            (
                'Image',
                'Video',
                'Document'
            )
        )
);
GO



/* =========================================================
   31. EVENTS
   ========================================================= */




/* =========================================================
   54. AUDIT LOGS
   ========================================================= */

CREATE TABLE AuditLogs
(
    AuditLogId BIGINT IDENTITY(1,1) NOT NULL,

    UserId UNIQUEIDENTIFIER NULL,

    ActionType VARCHAR(100) NOT NULL,

    EntityType VARCHAR(100) NULL,
    EntityId VARCHAR(100) NULL,

    OldValue NVARCHAR(MAX) NULL,
    NewValue NVARCHAR(MAX) NULL,

    IPAddress VARCHAR(45) NULL,

    UserAgent NVARCHAR(1000) NULL,

    CreatedAt DATETIME2(3) NOT NULL
        CONSTRAINT DF_AuditLogs_CreatedAt DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_AuditLogs
        PRIMARY KEY (AuditLogId),

    CONSTRAINT FK_AuditLogs_User
        FOREIGN KEY (UserId)
        REFERENCES Users(UserId)
);
GO



/* =========================================================
   PERFORMANCE INDEXES
   ========================================================= */

CREATE INDEX IX_UserRoles_UserId
ON UserRoles(UserId);
GO

CREATE INDEX IX_UserRoles_RoleId
ON UserRoles(RoleId);
GO

CREATE INDEX IX_Vendors_Status
ON Vendors(VerificationStatus, IsActive);
GO

CREATE INDEX IX_VendorCategories_Category
ON VendorCategories(CategoryId, VendorId);
GO

CREATE INDEX IX_VendorCategories_Vendor
ON VendorCategories(VendorId, CategoryId);
GO

CREATE INDEX IX_VendorLocations_City
ON VendorLocations(City, State);
GO

CREATE INDEX IX_Services_Category
ON Services(CategoryId, IsActive, ApprovalStatus);
GO

CREATE INDEX IX_Services_Vendor
ON Services(VendorId, IsActive);
GO

CREATE INDEX IX_Services_SubCategory
ON Services(SubCategoryId, IsActive);
GO

CREATE INDEX IX_Services_Price
ON Services(BasePrice, IsActive);
GO

CREATE INDEX IX_ServicePackages_Service
ON ServicePackages(ServiceId, IsActive);
GO

CREATE INDEX IX_ServiceItems_Service
ON ServiceItems(ServiceId);
GO

CREATE INDEX IX_PackageItems_Package
ON PackageItems(PackageId);
GO

CREATE INDEX IX_VendorAvailability_Date
ON VendorAvailability
(
    AvailableDate,
    Status,
    VendorId
);
GO

CREATE INDEX IX_VendorAvailability_VendorDate
ON VendorAvailability
(
    VendorId,
    AvailableDate,
    Status
);
GO



CREATE INDEX IX_Booking_Customer
ON Booking(CustomerId, CreatedAt DESC);
GO

CREATE INDEX IX_Booking_Vendor
ON Booking(VendorId, BookingDate, BookingStatus);
GO

CREATE INDEX IX_Booking_Event
ON Booking(EventId);
GO

CREATE INDEX IX_Booking_Status
ON Booking(BookingStatus, CreatedAt DESC);
GO

CREATE INDEX IX_BookingItems_Booking
ON BookingItems(BookingId);
GO

CREATE INDEX IX_BookingItems_Service
ON BookingItems(ServiceId);
GO

CREATE INDEX IX_BookingStatusHistory_Booking
ON BookingStatusHistory(BookingId, CreatedAt DESC);
GO

CREATE INDEX IX_Quotations_Customer
ON Quotations(CustomerId, CreatedAt DESC);
GO

CREATE INDEX IX_Quotations_Vendor
ON Quotations(VendorId, Status, CreatedAt DESC);
GO

CREATE INDEX IX_QuotationItems_Quotation
ON QuotationItems(QuotationId);
GO

CREATE INDEX IX_Payments_Booking
ON Payments(BookingId, PaymentStatus);
GO

CREATE INDEX IX_PaymentTransactions_Payment
ON PaymentTransactions(PaymentId, CreatedAt DESC);
GO

CREATE INDEX IX_Refunds_Booking
ON Refunds(BookingId, RefundStatus);
GO

CREATE INDEX IX_VendorPayouts_Vendor
ON VendorPayouts(VendorId, PayoutStatus, CreatedAt DESC);
GO

CREATE INDEX IX_PlatformCommission_Vendor
ON PlatformCommission(VendorId, CreatedAt DESC);
GO

CREATE INDEX IX_Reviews_Vendor
ON Reviews(VendorId, IsPublished, CreatedAt DESC);
GO

CREATE INDEX IX_ReviewImages_Review
ON ReviewImages(ReviewId);
GO

CREATE INDEX IX_Wishlists_Customer
ON Wishlists(CustomerId, CreatedAt DESC);
GO

CREATE INDEX IX_Conversations_Customer
ON Conversations(CustomerId, LastMessageAt DESC);
GO

CREATE INDEX IX_Conversations_Vendor
ON Conversations(VendorId, LastMessageAt DESC);
GO

CREATE INDEX IX_Messages_Conversation
ON Messages(ConversationId, CreatedAt DESC);
GO

CREATE INDEX IX_Notifications_User
ON Notifications(UserId, IsRead, CreatedAt DESC);
GO

CREATE INDEX IX_Offers_Vendor
ON Offers(VendorId, IsActive, StartDate, EndDate);
GO

CREATE INDEX IX_Offers_Service
ON Offers(ServiceId, IsActive, StartDate, EndDate);
GO

CREATE INDEX IX_Addresses_User
ON Addresses(UserId, IsDefault);
GO

CREATE INDEX IX_Media_Entity
ON Media(EntityType, EntityId, SortOrder);
GO

CREATE INDEX IX_AuditLogs_User
ON AuditLogs(UserId, CreatedAt DESC);
GO

CREATE INDEX IX_AuditLogs_Entity
ON AuditLogs(EntityType, EntityId, CreatedAt DESC);
GO


CREATE INDEX IX_Events_Customer
ON Events(CustomerId, EventDate);
GO

CREATE INDEX IX_Events_Date
ON Events(EventDate, Status);
GO

CREATE INDEX IX_EventGuests_Event
ON EventGuests(EventId);
GO