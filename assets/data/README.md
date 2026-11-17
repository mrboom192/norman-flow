# Data assets

Approved raw datasets belong in [`base/`](base/README.md). That guide specifies
filenames, supported formats, automatic bundling and the base/upload fallback rules.
The current base is a prepared CSV plus segment and ward GeoJSON. The legacy raw KMZ fixture is not part of this distribution.

**Team decision (November 17, 2026): the app displays the official results.**
The rankings come from the team's macro-enabled Excel tool (or the identical
Google Colab notebook). The app loads that tool's `norman_flow_rankings.csv`
with the segment, ward and crash-point GeoJSON, shows every value unchanged
and only checks it: keys must join, every `vc` must equal `volume ÷ capacity`
(to 1e-6), and ward ranks calculated from those values must equal the file's
`ward_ranks`. This replaces the earlier rule against a precomputed-results path.

Don't edit the base data. To update the rankings, run the Excel tool (or Colab)
with the new traffic and crash data, then use **Add new data & re-rank** to
import the results file it creates. **Restore official 2026 results** brings the
bundled files back. Recalculating from raw spreadsheets is only available under
**Advanced (unofficial)**, because its rules differ from the official tool.

Do not copy test fixtures into the application. The ACOG capacity PDF in `base/`
is a reference document, not an analysis input (the base-data script only bundles
data formats as inputs). The walkthrough video remains pending.
