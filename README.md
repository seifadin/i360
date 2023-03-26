# i360
إi360 تطبيق إسلامي موسوعي للعلوم الإسلامية الأساسية بشكل متكامل مختصر بسيط

<details>
<summary>v 0.9.1</summary>

| Header | Details |
|-----:|-----------|
|     Creation Date/Time | 23/03/2023  00:16|
|     Version | 0.9.1|
|     Version Code | 20230323|
|     AppGyver Runtime Version | 4.7.36|
|     Released OS | **Web** – **Android** - Google (aab) – **Android** - Huawei (aab) – **Android** - Amazon (aab) – **iOS** (ipa)|
|     Released Build# | 275037 – 275026 – 275026 – 275026 – 275028|
|     Released | 23/03/2023|
|     Notes | – App. Ver. info. is maintained within App., "i360db.xlsx" & on Support p. (≥ 0.9.1)|
|     | – Content Ed. info. is maintained within "i360db.xlsx" & on Support p. (≥ 0.9.1)|
|     Changes | Fix: Message for new content edition by:|
|     |   - Renamed "Get item from storage" for "i360Privacy" & "i360Edition" to "...Node", respectively to be able to call their value|
|     |  - Triggered "i360Edition" on data "i360cRecords" changed, if DB edition > "i360EditionNode"|
|     | Edit: In "i360db.xlsx - Complements", added "Version" field & reloaded DB schema|
|     | Add: In "الرئيسية" p., added "AppSupportRow" to include "AppVersion" info.|
|     | Edit: In "الرئيسية" p., added "ellipse-v" menu icon as to show/hide version info.|
  
</details>

<details>
<summary>v 0.9.0</summary>

| Header | Details |
|-----:|-----------|
|     Creation Date/Time | 15/03/2023 14:35|
|     Version | 0.9.0|
|     Version Code | 20230315|
|     AppGyver Runtime Version | 4.6.36|
|     Released OS | **Web** – **Android** - Google (aab) – **Android** - Huawei (aab) – **Android** - Amazon (aab) – **iOS** (ipa)|
|     Released Build# | 273739 – 273740 – 273740 – 273740 – 273742|
|     Released | 16/03/2023|
|     Notes | App. Ver. & Content Ed. info. are maintained within "i360db.xlsx" & on Support p. (0.9.0)|
|     Changes | Add: In "الرئيسية" p., "InteractionRow"|
|     | Add: In "المتصفح" p., "Share" icon & "ShareText"|
|     | Edit: In "الرئيسية" p., in "SciencesList", changed text & icon colors to blue (Primary) & changed text align (orientation) to right|
|     | Edit: In "الرئيسية" p., in "SciencesList", decreased list item top & bottom gaps from 8px to 4px|
|     | Add: In "الرئيسية" p., "SearchBarRow", to include "SearchBar" based on "Bing Custom Search" (https://customsearch.ai); created: 19/02/2023, activated: 26/02/2023|
|     | Edit: In "الرئيسية" p., moved "InputTools" icon to "SearchBarRow"|
|     | Edit: In "الرئيسية" p., moved "Support", "PrivacyPolicy" icons to "SciencesList"|
|     | Del: In "الرئيسية" p., "SupportRow"|
|     | Edit: In "المتصفح" p., changed "WebView" dimensions to better fit screen size, namely: Width=Grow to width; Height=Screen viewport height - 160|
|     | Edit: In "الرئيسية" p., change "Web" icon from "cloud" to "window-maximize" in "SciencesList" & "OSIcon"|
|     | Edit: In "الرئيسية" p., moved visibility condition of "InputTools" from icon to it's cell|
|     | Edit: On 07/03/2023, changed API key (to be deprecated on 01/02/2024) to personal token for "i360db.xlsx - Sciences", namely "i360db-R", that's read-only|
|     | Add: Imported "i360db.xlsx", "Complements" tab, to Airtable base (online database), including fields: "CustomSearch", "Google_VirtualKeyboard", "Huawei_VirtualKeyboard", "Edition"|
|     | Add: "i360dbc" data resource linked to "i360db.xlsx - Complements", Airtable using REST API with personal token, namely "i360dbc-R", that's read-only; NB - after 'getting collection', 'testing' & 'setting schema from response', change "Edition" field type from 'text' to 'date text' for compatibility use|
|     | Add: "i360Edition" storage item (as text)|
|     | Add: message for new Content Edition to show after Policy message comparing "i360Edition" to current date|
  
</details>
