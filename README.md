# i360
إi360 تطبيق إسلامي موسوعي للعلوم الإسلامية الأساسية بشكل متكامل مختصر بسيط

<details>
<summary>v 0.9.9</summary>

| Header | Details |
|-----:|-----------|
|     Creation Date/Time | 25/07/2023  16:14|
|     Version | 0.9.9|
|     Version Code | 20230725 (20230726 for Google)|
|     AppGyver Runtime Version | 4.9.72|
|     Released OS | **Web** – **Android** - Google (aab) – **Android** - Huawei (aab) – **Android** - Amazon (aab) – **Windows** - Amazon (aab) – **iOS** (ipa)|
|     Released Build# | 292251 – 292337 – 292332 – 292332 – 292332 – 292498|
|     Released | 26/07/2023|
|     Notes | _|
|     |   Edit: In _i360k_ data resource, regenerated first key used by app to disable live version & enable isolated testing of under development version|
|     |   Fix: In _الرئيسية_ p., edited _i360kVar_ data variable logic to refresh data upon _EntityQueryTerm_ change (see _https://answers.sap.com/questions/13646962/appgyver-how-to-pass-url-filter-parameters-in-rest.html_ & _https://blogs.sap.com/2022/05/22/dadiambored-no-code-challenge/_) only & stop auto data refresh thus stop consuming service calls quota (see _https://answers.sap.com/questions/13648115/appgyver-how-to-stop-rest-api-calls-done-automatic.html_)|
|     |   Edit: In _الرئيسية_ p., in _EntityList_ changed all _self.value_ to _Trim_WhiteSpace(self.value)_|
|     |   Edit: In _الرئيسية_ p., in _EntityList_ added logic to check language (using Arabic can't be Lower-/Upper-cased) & hence translate from English to Arabic (if needed), instead of the other way around|
|     |   Edit: In _الرئيسية_ p., in _EntityList_ changed text align (orientation) to right|
  
</details>

<details>
<summary>v 0.9.8</summary>

| Header | Details |
|-----:|-----------|
|     Creation Date/Time | 07/06/2023  14:48|
|     Version | 0.9.8|
|     Version Code | 20230607|
|     AppGyver Runtime Version | 4.7.37|
|     Released OS | **Web** – **Android** - Google (aab) – **Android** - Huawei (aab) – **Android** - Amazon (aab) – **Windows** - Amazon (aab) – **iOS** (ipa)|
|     Released Build# | 284795 – 284796 – 284796 – 284796 – 284796 – 284798|
|     Released | 07/06/2023|
|     Notes | _|
|     |   Fix: In _الرئيسية_ p., _SearchBar_, reordered logic to set _EntityQueryTerm_ before changing _EntitySearch_ icon as the earlier reads output of another node _HTTPflow_|
|     |   Edit: Renamed _[...]Errata_ to _[...]Appendix_ in: _i360db.xlsx - Sciences_ Airtable, _i360dbs_ data resource schema, & app. components|
|     |   Fix: _i360t_ data resource by changing _Record Properties_ (a.k.a. body) binding type to _Formula_ (instead of default: _Object with properties_) then setting it to: [{_Text_:_صلاح الدين الأيوبي_}] ***(functional)***|
|     |   Add: _i360tVar_ data variable, type: 'New data record', based on _i360t_ data resource ***(unfunctional)***|
|     |   Add: _EntityQueryTermRaw_ App Variable linked to _i360kVar_ _Record properties_|
|     |   Edit: _i360db.xlsx_, changed all _https://shamela.ws/_ sources to _https://ketabonline.com/_, except jurisprudence encyclopedias, for better consistency & visibility (04/07/2023)|
|     |   Edit: _i360db.xlsx_, changed all _https://app.box.com/_ sources to _https://archive.org/_, except Quranic interpretation errata, for lighter experience without downloads (07/07/2023)|
  
</details>

<details>
<summary>v 0.9.7</summary>

| Header | Details |
|-----:|-----------|
|     Creation Date/Time | 27/05/2023  21:15|
|     Version | 0.9.7|
|     Version Code | 20230527|
|     AppGyver Runtime Version | 4.7.37|
|     Released OS | **Web** – **Android** - Google (aab) – **Android** - Huawei (aab) – **Android** - Amazon (aab) – **Windows** - Amazon (aab) – **iOS** (ipa)|
|     Released Build# | 283398 – 283399 – 283399 – 283399 – 283399 – 283769|
|     Released | 27/05/2023|
|     Notes | _|
|     |   Add: _WebErrata_ app. variable of errata of related Web URL|
|     |   Edit: In _الرئيسية_ p., _SciencesList_, added _WebErrata_ setting logic|
|     |   Add: In _المتصفح_ p., _InteractionRow_, navigation button, namely: _Errata_, setting _WebView_ URL to _WebErrata_, visible only if exists|
|     |   Edit: In _المتصفح_ p., _InteractionRow_, adjusted cells widths in layout for better icons view|
  
</details>

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
|     |   Edit: In _الرئيسية_ p., _SearchBar_, added _HTTP request_ logic for _EntitySearch_|
|     |   Edit: In _الرئيسية_ p., _SearchBar_, used _HTTP request_ for _Translator_ & _Entity Search_ to display error message(s), if any|
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
|     |   Add: In _المتصفح_ p., _CurrentWebView_ page variable of current webpage as Web URL|
|     |   Fix: In _المتصفح_ p., set _Share_ to _CurrentWebView_, instead of _WebParam_!|
|     |   Edit: In _المتصفح_ p., _WebView_, set _CurrentWebView_ to customized _onChangeLocation_ _Receive event_ outputs|
|     |   Add: In _المتصفح_ p., _WebViewPages_ page variable of browsed webpages as List of Web URLs| 
|     |   Edit: In _المتصفح_ p., _WebView_, added _CurrentWebView_ to _WebViewPages_ incrementally, only if missing|
|     |   Add: In _المتصفح_ p., _CurrentWebViewIndex_ page variable of current webpage index in _WebViewPages_ as Number|
|     |   Add: In _المتصفح_ p., set _Share_ to _CurrentWebView_, instead of _WebParam_!|
|     |   Add: In _المتصفح_ p., _InteractionRow_, navigation buttons, namely: _GoBack_, _GoForward_, _Home_ icons, setting _WebView_ URL to previous, next, home items in _WebViewPages_ list, respectively|
  
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
|     |   Edit: In _الرئيسية_ p., _SearchBar_, changed _EntitySearch_ _checkedIcon_ to _language_ while translating|
|     |   Edit: In _الرئيسية_ p., _SearchBar_, changed _EntitySearch_ _checkedIcon_ to _tripadvisor_ (owl as a simple of knowledge) while entity searching, with 500ms delay|
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
|     Changes | Add: _i360t_ data resource linked to _Azure Translator_, to enable Translation of  Entity search term with required dynamic Request body _text_ in _Create Record (Post)_, created: 15/04/2023 ***(unfunctional***_; Error: JSON error response from server: {"error":{"code":400074,"message":"The body of the request is not valid JSON."}}.status: 400_***)***|
|     |   Edit: In _الرئيسية_ p., _SearchBar_ to add _HTTP Request_ for _Azure Translator_ for Entity search ***(functional)***|
|     |   Edit: In _الرئيسية_ p., _SearchBar_ placeholder from _بحث معرفي خارجي (بالإنجليزية)..._ to _بحث معرفي خارجي..._ for _External Knowledge Graph Entity Search_|
|     |   Edit: Renamed _i360db_ data resource to _i360dbs_ & related changed (for naming consistency)|
|     |   Edit: Renamed _i360Records_ data variable to _i360dbsVar_ & related changed|
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
|     |   Add: _i360kRecords_ data variable, type: 'Collection of data records', based on _i360k_ data resource)|
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
|     | Add: _i360dbcRecord_ data variable, type: 'Collection of data records', based on "i360dbc" data resource|
|     | Add: _i360Edition_ storage item (as text)|
|     | Add: message for new Content Edition to show after Policy message comparing _i360Edition_ to current date|
  
</details>
