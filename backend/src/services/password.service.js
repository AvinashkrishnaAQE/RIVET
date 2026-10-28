import argon2 from "argon2";
import { env } from "../config/env.js";

// argon2id is the variant recommended for password storage: resistant to both
// GPU cracking (memory-hard) and side-channel attacks. The salt is generated per
// hash and embedded in the encoded output along with these parameters, so raising
// them later never invalidates existing hashes -- see needsRehash().
const OPTIONS = Object.freeze({
    type: argon2.argon2id,
    memoryCost: env.ARGON2_MEMORY_KIB,
    timeCost: env.ARGON2_TIME_COST,
    parallelism: env.ARGON2_PARALLELISM,
});

export function hashPassword(plainPassword) {
    return argon2.hash(plainPassword, OPTIONS);
}

/** True when `plainPassword` matches `hash`. A malformed hash is a mismatch, not a crash. */
export async function verifyPassword(hash, plainPassword) {
    try {
        return await argon2.verify(hash, plainPassword);
    } catch {
        return false;
    }
}

/** True when the stored hash was made with weaker parameters than the current ones. */
export function needsRehash(hash) {
    return argon2.needsRehash(hash, OPTIONS);
}

// Verifying against a real hash when the account does not exist makes "unknown
// email" take as long as "wrong password", so response time cannot be used to
// discover which emails are registered.
let dummyHash;
export async function verifyAgainstDummy(plainPassword) {
    dummyHash ??= await hashPassword("timing-equalisation-placeholder");
    await verifyPassword(dummyHash, plainPassword);
}
