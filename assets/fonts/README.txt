EY Interstate - drop-in location
================================
ey-core.css resolves the typeface in this order:

  1. local()  - the installed font on the machine. This is the path that will
                be taken on any EY device, and it costs no network request.
  2. this folder, as .woff2
  3. www.ey.com, as .woff

To make the pack fully self-contained and remove the ey.com fallback entirely,
drop these three files in here and delete the ey.com url() lines from
ey-core.css:

  EYInterstate-Light.woff2     (300)
  EYInterstate-Regular.woff2   (400)
  EYInterstate-Bold.woff2      (700)

Only these three weights are declared, because only these three exist. The
previous build asked for 500, 600, 650 and 750 as well, which the browser
faked by synthetically emboldening the regular weight.

EY Interstate is licensed. Do not redistribute this folder outside EY.
