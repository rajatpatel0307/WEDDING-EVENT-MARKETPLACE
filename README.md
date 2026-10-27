# MarryNest Wedding Marketplace

React + Tailwind + Apollo Client frontend and Express + Apollo GraphQL + Sequelize/MSSQL backend.

The role-based authentication implementation, environment setup, database mapping, migration commands, secure administrator provisioning and verification limitations are documented in [Authentication setup](backend/docs/authentication.md).

Run `npm test` in each project and `npm run build` in `frontend`. Configure MSSQL, SMTP and signing secrets before running the backend. Do not apply database migrations until the existing database has been inspected and backed up.
