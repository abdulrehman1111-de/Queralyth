import app from "./app.js";
import { env } from "./config/env.js";

const PORT = env.port;
const HOST = env.host;

app.listen(PORT, HOST, () => {
  console.log(
    `Queralyth API running at http://${HOST}:${PORT}`
  );
});