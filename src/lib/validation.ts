import { z } from "zod";

export const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/, "A valid EVM address is required");
export const betSchema = z.object({ betAmount: z.string().regex(/^\d+(\.\d{1,18})?$/), cardIndex: z.number().int().min(0).max(17).optional() });
