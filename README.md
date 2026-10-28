# MarryNest Wedding Marketplace

React + Tailwind + Apollo Client frontend and Express + Apollo GraphQL + Sequelize/MSSQL backend.

The customer planning workspace is at `/customer/dashboard`. See [Customer workspace and Razorpay setup](backend/docs/customer-workspace.md) for event and guest management, service discovery, quotations, bookings, private messaging, payments, migrations and verification commands.

The approved vendor workspace is at `/vendor/dashboard`. See [Vendor workspace setup and API](backend/docs/vendor-workspace.md) for migrations, the 17 category forms, management routes, ownership rules and verification commands.

Cloudinary handles new signup documents and profile photos. See [Cloudinary setup](backend/docs/cloudinary.md) for required credentials and the profile photo database migration.

The role-based authentication implementation, environment setup, database mapping, migration commands, secure administrator provisioning and verification limitations are documented in [Authentication setup](backend/docs/authentication.md).

Run `npm test` in each project and `npm run build` in `frontend`. Configure MSSQL, SMTP and signing secrets before running the backend. Do not apply database migrations until the existing database has been inspected and backed up.
