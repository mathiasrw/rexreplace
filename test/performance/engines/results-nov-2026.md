Time relative to the fastest in the row

| | rr | rr -U | rr v | runtime | runtime -U | runtime v | regex+ |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1KB matches on Node | 1.03x | 1.03x | 1.02x | 1.00x | 1.00x | 1.01x | 1.06x |
| 1KB matches on Bun | 1.03x | 1.02x | 1.00x | 1.00x | 1.02x | 1.00x | 1.08x |
| 1KB no-matches on Node | 1.00x | 1.01x | 1.01x | 1.02x | 1.00x | 1.01x | 1.02x |
| 1KB no-matches on Bun | 1.02x | 1.01x | 1.01x | 1.00x | 1.00x | 1.01x | 1.03x |
| 100KB matches on Node | 1.00x | 1.02x | 1.01x | 1.01x | 1.02x | 1.00x | 1.02x |
| 100KB matches on Bun | 1.02x | 1.00x | 1.01x | 1.01x | 1.00x | 1.06x | 1.06x |
| 100KB no-matches on Node | 1.00x | 1.00x | 1.01x | 1.02x | 1.03x | 1.01x | 1.03x |
| 100KB no-matches on Bun | 1.01x | 1.05x | 1.04x | 1.01x | 1.00x | 1.01x | 1.03x |
| 1MB matches on Node | 1.02x | 1.00x | 1.01x | 1.01x | 1.03x | 1.00x | 1.04x |
| 1MB matches on Bun | 1.05x | 1.03x | 1.06x | 1.00x | 1.00x | 1.02x | 1.04x |
| 1MB no-matches on Node | 1.01x | 1.00x | 1.02x | 1.02x | 1.04x | 1.02x | 1.07x |
| 1MB no-matches on Bun | 1.02x | 1.00x | 1.03x | 1.02x | 1.00x | 1.02x | 1.05x |
| 10MB matches on Node | 1.06x | 1.00x | 1.05x | 1.04x | 1.01x | 1.02x | 1.07x |
| 10MB matches on Bun | 1.05x | 1.02x | 1.04x | 1.04x | 1.00x | 1.02x | 1.04x |
| 10MB no-matches on Node | 1.12x | 1.00x | 1.13x | 1.10x | 1.01x | 1.12x | 1.12x |
| 10MB no-matches on Bun | 1.12x | 1.02x | 1.14x | 1.22x | 1.00x | 1.13x | 1.14x |
| 100MB matches on Node | 1.09x | 1.00x | 1.13x | 1.08x | 1.01x | 1.11x | 1.09x |
| 100MB matches on Bun | 1.19x | 1.00x | 1.15x | 1.13x | 1.01x | 1.20x | 1.10x |
| 100MB no-matches on Node | 1.30x | 1.00x | 1.30x | 1.30x | 1.01x | 1.30x | 1.32x |
| 100MB no-matches on Bun | 1.33x | 1.00x | 1.39x | 1.32x | 1.01x | 1.33x | 1.40x |

Seconds for one run

| | rr | rr -U | rr v | runtime | runtime -U | runtime v | regex+ |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1KB matches on Node | 0.073 | 0.073 | 0.073 | 0.071 | 0.072 | 0.072 | 0.075 |
| 1KB matches on Bun | 0.037 | 0.037 | 0.037 | 0.037 | 0.037 | 0.036 | 0.040 |
| 1KB no-matches on Node | 0.070 | 0.071 | 0.071 | 0.072 | 0.070 | 0.071 | 0.072 |
| 1KB no-matches on Bun | 0.037 | 0.037 | 0.036 | 0.036 | 0.036 | 0.037 | 0.037 |
| 100KB matches on Node | 0.073 | 0.074 | 0.074 | 0.074 | 0.074 | 0.073 | 0.074 |
| 100KB matches on Bun | 0.037 | 0.037 | 0.037 | 0.037 | 0.037 | 0.039 | 0.039 |
| 100KB no-matches on Node | 0.071 | 0.071 | 0.072 | 0.073 | 0.073 | 0.072 | 0.073 |
| 100KB no-matches on Bun | 0.037 | 0.038 | 0.038 | 0.037 | 0.036 | 0.037 | 0.038 |
| 1MB matches on Node | 0.079 | 0.078 | 0.079 | 0.079 | 0.081 | 0.078 | 0.081 |
| 1MB matches on Bun | 0.040 | 0.039 | 0.040 | 0.038 | 0.038 | 0.039 | 0.040 |
| 1MB no-matches on Node | 0.074 | 0.073 | 0.075 | 0.075 | 0.076 | 0.075 | 0.078 |
| 1MB no-matches on Bun | 0.038 | 0.037 | 0.038 | 0.038 | 0.037 | 0.038 | 0.039 |
| 10MB matches on Node | 0.133 | 0.125 | 0.131 | 0.130 | 0.127 | 0.128 | 0.135 |
| 10MB matches on Bun | 0.063 | 0.061 | 0.062 | 0.062 | 0.060 | 0.061 | 0.062 |
| 10MB no-matches on Node | 0.115 | 0.102 | 0.115 | 0.113 | 0.103 | 0.114 | 0.115 |
| 10MB no-matches on Bun | 0.059 | 0.054 | 0.060 | 0.064 | 0.052 | 0.059 | 0.060 |
| 100MB matches on Node | 0.649 | 0.598 | 0.676 | 0.644 | 0.607 | 0.663 | 0.650 |
| 100MB matches on Bun | 0.292 | 0.246 | 0.284 | 0.278 | 0.249 | 0.296 | 0.271 |
| 100MB no-matches on Node | 0.506 | 0.389 | 0.505 | 0.505 | 0.392 | 0.506 | 0.514 |
| 100MB no-matches on Bun | 0.256 | 0.192 | 0.267 | 0.254 | 0.194 | 0.256 | 0.268 |

