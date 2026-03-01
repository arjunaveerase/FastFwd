from jinja2 import Template


STANDARD_TEMPLATES = {
    "RO_INITIAL": {
        "subject_pattern": "ReOrder SS FastFwd <> {{ vendor_name }} {{ date }}",
        "html_body": """
<p>Dear Vendor Team,</p>
<p>I hope you are doing well.</p>
<p>I am sharing a quick replenishment recommendation based on the recent movement we are seeing for your products.</p>
<p><strong>Quick summary</strong></p>
<ul>
  <li>Units sold in the last 30 days: <strong>{{ total_units_sold }} units</strong></li>
  <li>Suggested reorder quantity: <strong>{{ total_suggested_reorder }} units</strong></li>
</ul>
<p><strong>Warehouse-wise summary</strong></p>
<table style="border-collapse:collapse;width:100%;max-width:760px;border:1px solid #b9c2d0">
  <thead>
    <tr>
      <th style="padding:8px;border:1px solid #b9c2d0;text-align:left">Warehouse</th>
      <th style="padding:8px;border:1px solid #b9c2d0;text-align:right">Sales (30D)</th>
      <th style="padding:8px;border:1px solid #b9c2d0;text-align:right">Current Stock</th>
      <th style="padding:8px;border:1px solid #b9c2d0;text-align:right">Suggested Reorder</th>
    </tr>
  </thead>
  <tbody>
    {{ warehouse_table_html | safe }}
  </tbody>
</table>
<p>Please review and share the feasible replenishment quantity and dispatch timeline from your end.</p>
<p>Regards,<br><strong>{{ sender_name }}</strong></p>
""",
    },
    "RO_FOLLOWUP": {
        "subject_pattern": "ReOrder SS FastFwd <> {{ vendor_name }} {{ date }}",
        "html_body": """
<p>Dear Vendor Team,</p>
<p>This is a follow-up on the replenishment recommendation shared earlier.</p>
<p><strong>Current requirement</strong></p>
<ul>
  <li>Units sold in the last 30 days: <strong>{{ total_units_sold }} units</strong></li>
  <li>Suggested reorder quantity: <strong>{{ total_suggested_reorder }} units</strong></li>
</ul>
<p><strong>Warehouse-wise summary</strong></p>
<table style="border-collapse:collapse;width:100%;max-width:760px;border:1px solid #b9c2d0">
  <thead>
    <tr>
      <th style="padding:8px;border:1px solid #b9c2d0;text-align:left">Warehouse</th>
      <th style="padding:8px;border:1px solid #b9c2d0;text-align:right">Sales (30D)</th>
      <th style="padding:8px;border:1px solid #b9c2d0;text-align:right">Current Stock</th>
      <th style="padding:8px;border:1px solid #b9c2d0;text-align:right">Suggested Reorder</th>
    </tr>
  </thead>
  <tbody>
    {{ warehouse_table_html | safe }}
  </tbody>
</table>
<p>Please share an update on the quantities you can support and the expected dispatch timeline.</p>
<p>Regards,<br><strong>{{ sender_name }}</strong></p>
""",
    },
    "RO_FINAL": {
        "subject_pattern": "ReOrder SS FastFwd <> {{ vendor_name }} {{ date }}",
        "html_body": """
<p>Dear Vendor Team,</p>
<p>This is the final follow-up on the replenishment plan requested earlier.</p>
<p><strong>Final pending requirement</strong></p>
<ul>
  <li>Units sold in the last 30 days: <strong>{{ total_units_sold }} units</strong></li>
  <li>Suggested reorder quantity: <strong>{{ total_suggested_reorder }} units</strong></li>
</ul>
<p><strong>Warehouse-wise summary</strong></p>
<table style="border-collapse:collapse;width:100%;max-width:760px;border:1px solid #b9c2d0">
  <thead>
    <tr>
      <th style="padding:8px;border:1px solid #b9c2d0;text-align:left">Warehouse</th>
      <th style="padding:8px;border:1px solid #b9c2d0;text-align:right">Sales (30D)</th>
      <th style="padding:8px;border:1px solid #b9c2d0;text-align:right">Current Stock</th>
      <th style="padding:8px;border:1px solid #b9c2d0;text-align:right">Suggested Reorder</th>
    </tr>
  </thead>
  <tbody>
    {{ warehouse_table_html | safe }}
  </tbody>
</table>
<p>Kindly treat this as urgent and confirm the dispatch plan at the earliest.</p>
<p>Regards,<br><strong>{{ sender_name }}</strong></p>
""",
    },
}


def normalize_template_type(value: str) -> str:
    token = (value or "").strip().upper()
    if token.startswith("RO_IN"):
        return "RO_INITIAL"
    if token.startswith("RO_FO"):
        return "RO_FOLLOWUP"
    if token.startswith("RO_FIN"):
        return "RO_FINAL"
    if token in STANDARD_TEMPLATES:
        return token
    return "RO_INITIAL"


def render_template(template_type: str, context: dict):
    normalized = normalize_template_type(template_type)
    config = STANDARD_TEMPLATES[normalized]
    subject = Template(config["subject_pattern"]).render(**context)
    body = Template(config["html_body"]).render(**context)
    return subject, body
