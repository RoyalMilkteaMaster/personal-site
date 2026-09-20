# Neck R4 floor finding — Root bounded countercheck
Root read the final shader and independently reran reviewer scratch n4g.py on frozen R4, then measured actual point-support-size-id.f32 X weights in the identical projected boxes.

- Right collar: 957 role0 rows; 513 have weight below 1; 24 are at 0.2. Min/median/max = 0.2 / 0.966091 / 1.
- Dark window: 1264 role0 rows; 577 below 1; 33 at 0.2. Min/median/max = 0.1976849 / 1 / 1.

The review's row counts and zero fully-zero weights reproduce, but its statement that the field reaches NONE of these rows or that all are unattenuated is false. n4g.py tests only weight == 0. The shader actually multiplies vFade by aPointSupport.x; a 20-percent floor is intentionally nonzero. The field already partly reaches both boxes. Raw projection counts also include rows without confirming front-facing/depth/pixel contribution, so 12:1/29:1 is not a measured rendered-contribution ratio. Role0 reference RGB zero means it follows atlas/photo transfer, not literally no source material.

Actual STAR renderer uses premultiplied ONE / ONE_MINUS_SRC_ALPHA blending and depthMask(false), with reference and general rows interleaved in the same draw. Pixel overlap/draw order is a plausible mechanism to test, not proven by counts alone. No shader/order change authorized by this note. The original-vs-model regional contrast difference remains a valid appearance observation. A bounded static weight-only A/B at the existing 20-percent floor, preserving exact source records and both endpoints, can test whether remaining floor contribution causes it. Do not repeat the rejected broad 8-percent field or treat a percentile as a new blanket brightness target.
