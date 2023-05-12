# i360
إi360 تطبيق إسلامي موسوعي للعلوم الإسلامية الأساسية بشكل متكامل مختصر بسيط

<details>
<summary>v 0.9.6</summary>

| Header | Details |
|-----:|-----------|
|     Creation Date/Time | 12/05/2023  21:23|
|     Version | 0.9.6|
|     Version Code | 20230512|
|     AppGyver Runtime Version | 4.7.37|
|     Released OS | **Web** – **Android** - Google (aab) – **Android** - Huawei (aab) – **Android** - Amazon (aab) – **Windows** - Amazon (aab) – **iOS** (ipa)|
|     Released Build# | 281499 – 281500 – 281500 – 281500 – 281500 – 281502|
|     Released | 12/05/2023|
|     Notes | _|
|     |   Edit:  In _الرئيسية_ p., _SearchBar_, added _HTTP request_ logic for _EntitySearch_|
|     |   Edit:  In _الرئيسية_ p., _SearchBar_, used _HTTP request_ for _Translator_ & _Entity Search_ to display error message(s), if any|
|     |   Add: In _الرئيسية_ p., _SearchBar_, _HTTPrequest_ flow function (based on that of _Translator_ as it's more options) combining _HTTP request_ logic, with error handling mechanism|
  
</details>

<details>
<summary>v 0.9.5</summary>

| Header | Details |
|-----:|-----------|
|     Creation Date/Time | 07/05/2023  23:28|
|     Version | 0.9.5|
|     Version Code | 20230507|
|     AppGyver Runtime Version | 4.7.37|
|     Released OS | **Web** – **Android** - Google (aab) – **Android** - Huawei (aab) – **Android** - Amazon (aab) – **Windows** - Amazon (aab) – **iOS** (ipa)|
|     Released Build# | 280703 – 280704 – 280704 – 280704 – 280704 – 280706|
|     Released | 07/05/2023|
|     Notes | Sometimes, PDF files were downloaded not opened as intended, so I thought about changing WebView app variables data types from _Web URL_ to _URL_ as a possible solution but some sites already worked as-is as of 07/05/2023, so no change was made!|
|     |   Add:  In __المتصفح__ p., __CurrentWebView__ page variable of current webpage as Web URL|
|     |   Fix: In __المتصفح__ p., set __Share__ to __CurrentWebView__, instead of __WebParam__!|
|     |   Edit:  In __المتصفح__ p., __WebView__, set __CurrentWebView__ to customized __onChangeLocation__ __Receive event__ outputs|
|     |   Add:  In __المتصفح__ p., __WebViewPages__ page variable of browsed webpages as List of Web URLs| 
|     |   Edit:  In __المتصفح__ p., __WebView__, added __CurrentWebView__ to __WebViewPages__ incrementally, only if missing|
|     |   Add:  In __المتصفح__ p., __CurrentWebViewIndex__ page variable of current webpage index in __WebViewPages__ as Number|
|     |   Add: In __المتصفح__ p., set __Share__ to __CurrentWebView__, instead of __WebParam__!|
|     |   Add: In __المتصفح__ p., navigation buttons, namely: __GoBack__, __GoForward__, __Home__ icons, setting __WebView__ URL to previous, next, home items in __WebViewPages__ list, respectively|
  
</details>

<details>
<summary>v 0.9.4</summary>

| Header | Details |
|-----:|-----------|
|     Creation Date/Time | 27/04/2023  13:36|
|     Version | 0.9.4|
|     Version Code | 20230427|
|     AppGyver Runtime Version | 4.7.37|
|     Released OS | **Web** – **Android** - Google (aab) – **Android** - Huawei (aab) – **Android** - Amazon (aab) – **Windows** - Amazon (aab) – **iOS** (ipa)|
|     Released Build# | 279389 – 279390 – 279390 – 279390 – 279390 – 279392|
|     Released | 27/04/2023|
|     Notes | _|
|     |   Edit:  In _الرئيسية_ p., _SearchBar_, changed _EntitySearch_ _checkedIcon_ to _language_ while translating|
|     |   Edit:  In _الرئيسية_ p., _SearchBar_, changed _EntitySearch_ _checkedIcon_ to _tripadvisor_ (owl as a simple of knowledge) while entity searching, with 500ms delay|
|     |   Edit: In _الرئيسية_ p., change _Web_ icon from _window-maximize_ to _dribbble_ (~globe) in _SciencesList_ & _OSIcon_|
  
</details>

<details>
<summary>v 0.9.3</summary>

| Header | Details |
|-----:|-----------|
|     Creation Date/Time | 17/04/2023  13:33|
|     Version | 0.9.3|
|     Version Code | 20230417|
|     AppGyver Runtime Version | 4.7.36|
|     Released OS | **Web** – **Android** - Google (aab) – **Android** - Huawei (aab) – **Android** - Amazon (aab) – **iOS** (ipa)|
|     Released Build# | 278064 – 278065 – 278065 – 278065 – 278067|
|     Released | 17/04/2023|
|     Notes | _|
|     Changes | Add: _i360t_ data resource linked to _Azure Translator_, to enable Translation of  Entity search term with required dynamic Request body _text_ in _Create Record (Post)_, created: 15/04/2023 (unfunctional)|
|     |   Edit: In _الرئيسية_ p., _SearchBar_ to add _HTTP Request_ for _Azure Translator_ for Entity search (functional)|
|     |   Edit: In _الرئيسية_ p., _SearchBar_ placeholder from _بحث معرفي خارجي (بالإنجليزية)..._ to _بحث معرفي خارجي..._ for _External Knowledge Graph Entity Search_|
|     |   Edit: Renamed _i360db_ data resource to _i360dbs_ & related changed (for naming consistency)|
|     |   Edit: Renamed _i360dbRecords_ data variable to _i360dbsVar_ & related changed|
|     |   Edit: Renamed _i360dbcRecord_ data variable to _i360dbcVar_ & related changed|
|     |   Edit: Renamed _i360kRecords_ data variable to _i360kVar_ & related changed|
  
</details>

<details>
<summary>v 0.9.2</summary>

| Header | Details |
|-----:|-----------|
|     Creation Date/Time | 14/04/2023  14:09|
|     Version | 0.9.2|
|     Version Code | 20230414|
|     AppGyver Runtime Version | 4.7.36|
|     Released OS | **Web** – **Android** - Google (aab) – **Android** - Huawei (aab) – **Android** - Amazon (aab) – **iOS** (ipa)|
|     Released Build# | 277738 – 277739 – 277739 – 277739 – 277750|
|     Released | 14/04/2023|
|     Notes | _|
|     Changes | Add: _i360k_ data resource linked to _Bing Web Search_, to enable _Bing Entity Search_ (Knowledge Graph Search) with required dynamic query term _q_ in _Get Collection_, created: 03/04/2023|
|     |   Add: _i360kRecords_ data variable, type: 'collection of data records', based on _i360k_ data resource)|
|     |   Add: _EntityQueryTerm_ App Variable linked to _i360kRecords'_ query term _q_|
|     |   Add: In _الرئيسية_ p., in _EntityList_ large image list item (with _Repeat to_ _i360kRecords_ data variable)|
|     |   Add: In _الرئيسية_ p., in _SearchBarRow_, _EntitySearch_ checkbox|
|     |   Edit: In _الرئيسية_ p., _SearchBar_ to enable _Custom Search_ & _Entity Search_ based on _EntitySearch_|
|     |   Edit: In _الرئيسية_ p., _SearchBar_ placeholder from _بحث..._ to _بحث مخصص داخلي..._ for _Internal Custom Search_ & _بحث معرفي خارجي (بالإنجليزية)..._ for _External Knowledge Graph Entity Search_|
  
</details>

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
|     |   - Renamed _Get item from storage_ logic for _i360Privacy_ & _i360Edition_ to _...Node_, respectively to be able to call their value|
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
|     Changes | Add: In _المتصفح_ p., _InteractionRow_|
|     | Add: In _المتصفح_ p., _Share_ icon & _ShareText_|
|     | Edit: In _الرئيسية_ p., in _SciencesList_, changed text & icon colors to blue (Primary) & changed text align (orientation) to right|
|     | Edit: In _الرئيسية_ p., in _SciencesList_, decreased list item top & bottom gaps from 8px to 4px|
|     | Add: In _الرئيسية_ p., _SearchBarRow_, to include _SearchBar_ based on _Bing Custom Search_ (https://customsearch.ai); created: 15/02/2023, activated: 26/02/2023|
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
