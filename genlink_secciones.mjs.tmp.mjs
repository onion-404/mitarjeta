import { createClient } from "@supabase/supabase-js";
import fs from "fs";
const env = fs.readFileSync(".env.local", "utf8");
function getVar(name) {
  const line = env.split("\n").find((l) => l.startsWith(name + "="));
  return line ? line.slice(name.length + 1).trim().replace(/\r$/, "") : null;
}
const supabase = createClient(getVar("NEXT_PUBLIC_SUPABASE_URL"), getVar("SUPABASE_SERVICE_ROLE_KEY"));
const email = process.argv[2];
const redirectTo = process.argv[3];
const { data, error } = await supabase.auth.admin.generateLink({ type: "magiclink", email, options: { redirectTo } });
if (error) { console.error(error); process.exit(1); }
console.log(data.properties.action_link);
