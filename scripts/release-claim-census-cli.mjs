#!/usr/bin/env node
import { runCensus } from "./release-claim-census.mjs";

process.exitCode = runCensus();
