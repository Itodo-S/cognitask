import postgres from 'postgres';
const sql = postgres('postgresql://postgres.lgfopqpsiwpyupwcgyjv:N4TixVW-3Wj_KSY@aws-1-eu-west-1.pooler.supabase.com:6543/postgres', { ssl: 'require' });
async function test() {
  try {
    const res = await sql`SELECT 1`;
    console.log("Success:", res);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    process.exit(0);
  }
}
test();
