// Loads .env.local before any other module initializes.
// Imported FIRST in run_batch.mts so model config exists when
// src/lib/simulation.ts constructs its clients at import time.
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
