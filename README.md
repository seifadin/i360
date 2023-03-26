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
|     Notes | – App. Ver. info. is maintained within App., _i360db.xlsx_ & on Support p. (≥ 0.9.1)|
|     | – Content Ed. info. is maintained within _i360db.xlsx_ & on Support p. (≥ 0.9.1)|
|     Changes | Fix: Message for new content edition by:|
|     |   - Renamed _Get item from storage_ for _i360Privacy_ & _i360Edition_ to _...Node_, respectively to be able to call their value|
|     |  - Triggered _i360Edition_ on data _i360cRecords_ changed, if DB edition > _i360EditionNode_|
|     | Edit: In _i360db.xlsx - Complements_, added _Version_ field & reloaded DB schema|
|     | Add: In _الرئيسية_ p., added _AppSupportRow_ to include _AppVersion_ info.|
|     | Edit: In _الرئيسية_ p., added _ellipse-v_ menu icon as to show/hide version info.|
  
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
|     Notes | App. Ver. & Content Ed. info. are maintained within _i360db.xlsx_ & on Support p. (0.9.0)|
|     Changes | Add: In _الرئيسية_ p., _InteractionRow_|
|     | Add: In _المتصفح_ p., _Share_ icon & _ShareText_|
|     | Edit: In _الرئيسية_ p., in _SciencesList_, changed text & icon colors to blue (Primary) & changed text align (orientation) to right|
|     | Edit: In _الرئيسية_ p., in _SciencesList_, decreased list item top & bottom gaps from 8px to 4px|
|     | Add: In _الرئيسية_ p., _SearchBarRow_, to include _SearchBar_ based on _Bing Custom Search_ (https://customsearch.ai); created: 19/02/2023, activated: 26/02/2023|
|     | Edit: In _الرئيسية_ p., moved _InputTools_ icon to _SearchBarRow_|
|     | Edit: In _الرئيسية_ p., moved _Support_, _PrivacyPolicy_ icons to _SciencesList_|
|     | Del: In _الرئيسية_ p., _SupportRow_|
|     | Edit: In _المتصفح_ p., changed _WebView_ dimensions to better fit screen size, namely: Width=Grow to width; Height=Screen viewport height - 160|
|     | Edit: In _الرئيسية_ p., change _Web_ icon from _cloud_ to _window-maximize_ in _SciencesList_ & _OSIcon_|
|     | Edit: In _الرئيسية_ p., moved visibility condition of _InputTools_ from icon to it's cell|
|     | Edit: On 07/03/2023, changed API key (to be deprecated on 01/02/2024) to personal token for _i360db.xlsx - Sciences_, namely _i360db-R_, that's read-only|
|     | Add: Imported _i360db.xlsx_, _Complements_ tab, to Airtable base (online database), including fields: _CustomSearch_, _Google_VirtualKeyboard_, _Huawei_VirtualKeyboard_, _Edition_|
|     | Add: _i360dbc_ data resource linked to _i360db.xlsx - Complements_, Airtable using REST API with personal token, namely _i360dbc-R_, that's read-only; NB - after 'getting collection', 'testing' & 'setting schema from response', change _Edition_ field type from 'text' to 'date text' for compatibility use|
|     | Add: _i360Edition_ storage item (as text)|
|     | Add: message for new Content Edition to show after Policy message comparing _i360Edition_ to current date|
  
</details>
