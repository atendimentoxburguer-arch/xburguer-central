import pg from 'pg';
import { postgresDatabase,migrate } from './db.mjs';
import { application,bootstrapAdmin } from './server.mjs';

if (!process.env.DATABASE_URL || !process.env.PUBLIC_ORIGIN) {
  throw new Error('Configure DATABASE_URL e PUBLIC_ORIGIN no servidor.');
}
const pool = new pg.Pool({connectionString:process.env.DATABASE_URL,max:10,
  connectionTimeoutMillis:5000,idleTimeoutMillis:30000});
const db = postgresDatabase(pool);
await migrate(db);
await bootstrapAdmin(db,process.env.ADMIN_EMAIL,process.env.ADMIN_PASSWORD);
const server = application(db,{origin:process.env.PUBLIC_ORIGIN,whatsapp:{
  appSecret:process.env.WHATSAPP_APP_SECRET,verifyToken:process.env.WHATSAPP_VERIFY_TOKEN,
  phoneNumberId:process.env.WHATSAPP_PHONE_NUMBER_ID,accessToken:process.env.WHATSAPP_ACCESS_TOKEN,
  version:process.env.WHATSAPP_API_VERSION
}});
server.listen(Number(process.env.PORT || 3080),process.env.HOST || '127.0.0.1',()=>{
  console.log('X Burguer Platform pronta na porta '+(process.env.PORT || 3080));
});
async function stop() { server.close(async()=>{await db.close();process.exit(0);}); }
process.on('SIGINT',stop);process.on('SIGTERM',stop);
