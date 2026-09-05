// node db/role.test.js
import assert from 'node:assert/strict'
import { roleForUnclaimedBoard } from './index.js'

// Anonymous creator of their own (unclaimed) board can draw.
assert.equal(roleForUnclaimedBoard([{ userId: null }]), 'HOST')
// Board row not written yet (first connect persists it) - still drawable.
assert.equal(roleForUnclaimedBoard([]), 'HOST')
// Someone else's board stays read-only for anonymous visitors.
assert.equal(roleForUnclaimedBoard([{ userId: 'cmstfbbyf000004jwhh42a843' }]), 'AUDIENCE')

console.log('ok: anonymous role resolution')
