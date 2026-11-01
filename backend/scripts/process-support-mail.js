import { sequelize } from '../src/config/database.js';
import { processMail } from '../src/modules/cms/support.service.js';
try{console.log(await processMail());}catch{console.error('Support email worker unavailable.');process.exitCode=1;}finally{await sequelize.close();}
