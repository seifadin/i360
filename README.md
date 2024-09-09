# i360
إi360 تطبيق إسلامي موسوعي للعلوم الإسلامية الأساسية بشكل متكامل مختصر بسيط
• https://i36O.wordpress.com

<details>
<summary>v 0.10.4</summary>

| Header | Details |
|-----:|-----------|
|     Creation Date/Time | 09/09/2024  20:45|
|     Version | 0.10.4|
|     Version Code | 20240909|
|     AppGyver Runtime Version | 4.11.167|
|     Released OS | **Web** – **Android** - Google (aab) – **Android** - Huawei (aab) – **Android** - Amazon (aab) – **Windows** - Amazon (aab) – **Android** - APKPure (_apk_) – **iOS** (ipa)|
|     Released Build# | 37670 – 37671 – 37671 – 37671 – 37671 – _21836_ – 37672|
|     Released | 09/09/2024|
|     Notes | _|
|     Changes |   Add: In _الرئيسية_ p., in _SearchBarRow_, _BotSearchIcon_ icon, set to _magic_, & logic similar to that of _SearchBar_, to highlight GenAI bot|
|     |   Edit: In _الرئيسية_ p., in _SearchBarRow_ _SearchIcon_ logic, removed _Internal Knowledge Graph Entity Bot_ option|
|     |   Edit: In _الرئيسية_ p., in _SearchBarRow_ _SearchIcon_ logic, changed icons of: _Internal Custom_, _External Knowledge Graph Entity_ Searches to _binoculars_, _external-link_ from _sign-in_, _sign-out_|
|     |   Edit: In _الرئيسية_ p., in _SearchBarRow_ _SearchBar_ logic, added setting _SearchSource_ page variable to 0 (as _SearchIcon_ counter now stops at 1!)|
|     |   Edit: In _الرئيسية_ p., moved _EntityList_ to _ScrollView_, above _SciencesList_, to enable scrolling of the list|
|     |   Edit: In _الرئيسية_ p., in _ScrollView_ _EntityList_, changed text color to _Primary_|
|     |   Edit: In _المتصفح_ p., in _NavigateBack_, changed icon from _fast-backward_ in _Font Awesome_ icon set to _begin_ in _Fiori Icons_ icon set, rotated 180°|
|     |   Edit: In _المتصفح_ p., in _Appendix_, changed icon from _link_ to _paperclip_|
|     |   Edit: In _المتصفح_ p., in _Share_, changed icon from _share-square-o_ to _share-alt_|
|     |   Add: _WebBrowserflow_ flow function combining _useWeb_, _WebParam_/_URL_ variables used to switch between: _WebView_, default web browser, respectively|
|     |   Edit: In _الرئيسية_ p., in _BotSearchIcon_, _SearchBar_ logic, replaced relevant components with _WebBrowserflow_|
|     |   Fix: In _الرئيسية_ p., in _ScrollView_ _EntityList_, changed _Image source_ to _current.image.hostPageUrl_ from _current.image.thumbnailUrl_|
|     |   Edit: changed all applicable components background color to _Level 1 Background_ from _App Background_ as it's brighter white!|

</details>

<details>
<summary>v 0.10.3</summary>

| Header | Details |
|-----:|-----------|
|     Creation Date/Time | 31/08/2024  04:14|
|     Version | 0.10.3|
|     Version Code | 20240831|
|     AppGyver Runtime Version | 4.11.163|
|     Released OS | **Android** - Google (aab)|
|     Released Build# | 36573|
|     Released | 31/08/2024|
|     Notes | SAP Build Apps builds require Android SDK published on non-SAP site to be version 34 or higher. This change sets the minimum supported device version to Android 14.|
|     Changes |   ***(as Version Code: 20240607)***|

| Header | Details |
|-----:|-----------|
|     Creation Date/Time | 07/06/2024  03:58|
|     Version | 0.10.3|
|     Version Code | 20240607|
|     AppGyver Runtime Version | 4.11.114|
|     Released OS | **Web** – **Android** - Google (aab) – **Android** - Huawei (aab) – **Android** - Amazon (aab) – **Windows** - Amazon (aab) – **Android** - APKPure (_apk_) – **iOS** (ipa)|
|     Released Build# | 28606 – 28607 – 28607 – 28607 – 28607 – _28607_ – 28608|
|     Released | 07/06/2024|
|     Notes | To date, SAP Build Apps (AppGyver) builds require Android SDK to be version 26 (Released in 2017). This change depreciates support for Android 6 & 7 devices and sets the minimum version to Android 8 Oreo.|
|     Changes |   Edit:  In _الرئيسية_ p., in _SearchBarRow_ _SearchIcon_ logic, setting _StarRating_ values according to _SearchSource_ plus 1|
|     |   Edit:  In _الرئيسية_ p., in _SearchBarRow_ _StarRating_ logic, added _Tap component_ logic to programmatically tap _SearchIcon_ component ***(unfunctional)***|
|     |   Add: _i360g_ data resource linked to _Vectara.com_, to add GenAI with required dynamic Request body _text_ in _Create Record (Post)_; and changing _Record Properties_ (a.k.a. body) binding type to _Formula_ (instead of default: _Object with properties_) then setting it to: `{query: [{"query":"الأشعرية","queryContext":"","start":0,"numResults":25,"contextConfig":{"charsBefore":0,"charsAfter":0,"sentencesBefore":2,"sentencesAfter":2,"startTag":"%START_SNIPPET%","endTag":"%END_SNIPPET%"},"rerankingConfig":{"rerankerId":272725718,"mmrConfig":{"diversityBias":0}},"corpusKey":[{"customerId":757392150,"corpusId":2,"semantics":0,"metadataFilter":"","lexicalInterpolationConfig":{"lambda":0.025},"dim":[]}],"summary":[{"debug":false,"chat":{"store":true,"conversationId":""},"maxSummarizedResults":5,"responseLang":"ara","summarizerPromptName":"vectara-summary-ext-v1.2.0","factualConsistencyScore":true}]}]}` ***(functional; unused)***; created: 04/06/2024|
|     |   Edit: set _BotSearch_ field to _BotSonic.com_ (based on model: _ChatGPT_); set: 05/06/2024|
|     |   Edit: disabled _Navigation header bar_ as page name was now forcely displayed even on primary root page|
|     |   Edit: In _المتصفح_ p., changed _WebView_ dimensions to better fit screen size, namely: Width=Grow to width; Height=Screen viewport height - 120|
|     |   Edit: In _المتصفح_ p., added _NavigateBack_ icon to _HeaderRow_ to navigate back to app root p.|
  
</details>

<details>
<summary>v 0.10.2</summary>

| Header | Details |
|-----:|-----------|
|     Creation Date/Time | 20/03/2024  14:00|
|     Version | 0.10.2|
|     Version Code | 20240320|
|     AppGyver Runtime Version | 4.9.201|
|     Released OS | **Web** – **Android** - Google (aab) – **Android** - Huawei (aab) – **Android** - Amazon (aab) – **Windows** - Amazon (aab) – **Android** - APKPure (_apk_) – **iOS** (ipa)|
|     Released Build# | 21847 – 21836 – 21836 – 21836 – 21836 – _21836_ – 25776|
|     Released | 24/03/2024|
|     Notes | **First release as: _SAP Build Apps_**|
|     Changes |   Edit: In _الرئيسية_ p., _i360Privacy_ item message changed short link to https://tinyurl.com/i360Privacy (missed in this _Android_ version)|
|     |   Fix: In _المتصفح_ p., _Share_ _CurrentWebView_ of first webpage by:|
|     |   - Add: In _المتصفح_ p., _CurrentWebViewTemp_ page variable of current webpage as Web URL|
|     |   - Edit: In _المتصفح_ p., _CurrentWebViewTemp_ equated to _CurrentWebView_ formula|
|     |   - Edit: In _المتصفح_ p., _CurrentWebView_ equated to _CurrentWebViewTemp_ value only if not equal to _about:blank_ (as its value fluctuates between URL & _about:blank_ so and _if_ registers URL only)|
|     |   Edit: set _BotSearch_ field to _MindStudio.ai_, a.k.a. _YouAI.ai_, (based on model: _ChatGPT_/_Claude_); using _Generate Prompt_: _Arabic knowledge retrieval bot from given Arabic data sources_; set: 20/05/2024|
|     |   Edit: Changed _MindStudio.ai_ _Generate Prompt_ to: _clear, concise, informative, and professional Arabic knowledge retrieval bot using only uploaded Arabic data sources with citation and ability to handle complex queries in Arabic_, to ensure using only uploaded data sources; set: 30/05/2024|

</details>

<details>
<summary>v 0.10.1</summary>

| Header | Details |
|-----:|-----------|
|     Creation Date/Time | 10/11/2023  01:25|
|     Version | 0.10.1|
|     Version Code | 20231109|
|     AppGyver Runtime Version | 4.9.110|
|     Released OS | **Web** – **Android** - Google (aab) – **Android** - Huawei (aab) – **Android** - Amazon (aab) – **Windows** - Amazon (aab) – **Android** - APKPure (_apk_) – **iOS** (ipa)|
|     Released Build# | 304998 – 304999 – 304999 – 304999 – 304999 – _304999_ – 305000|
|     Released | 10/11/2023|
|     Notes | _|
|     Changes |   Edit: _i360dbs_ data resource by adding query parameter _size_ set to 200 (default: 100) to allow maximum page size (row count) limit: 200|
|     |   Edit: In _الرئيسية_ p., in _EntityList_, added a new line between Entity name & its description in shared current text|
  
</details>

<details>
<summary>v 0.10.0</summary>

| Header | Details |
|-----:|-----------|
|     Creation Date/Time | 22/10/2023  18:03|
|     Version | 0.10.0|
|     Version Code | 20231022|
|     AppGyver Runtime Version | 4.9.72|
|     Released OS | **Web** – **Android** - Google (aab) – **Android** - Huawei (aab) – **Android** - Amazon (aab) – **Windows** - Amazon (aab) – **Android** - APKPure (_apk_) – **iOS** (ipa)|
|     Released Build# | 303425 – 303426 – 303426 – 303426 – 303426 – _303426_ – 303427|
|     Released | 22/10/2023|
|     Notes | _|
|     Changes |   Add: In _الرئيسية_ p., _SearchSource_ page variable with initial value 0|
|     |   Add:  In _الرئيسية_ p., in _SearchBarRow_ _SearchIcon_, along with _SearchSource_ page variable, to replace _EntitySearch_ Checkbox. This icon will serve as a 3-state component for: _Internal Custom_, _External Knowledge Graph Entity_, _Internal Knowledge Graph Entity Bot_ Searches|
|     |   Edit: In _الرئيسية_ p., _SearchBarRow_ _SearchBar_ placeholder, added _بحث بوت معرفي داخلي..._ for _Internal Bot Knowledge Graph Entity Search_|
|     |   Edit: In _i360db.xlsx - Complements_, added GenAI chatbot _BotSearch_ field & reloaded DB schema|
|     |   Edit: In _الرئيسية_ p., _SearchBarRow_ _SearchBar_ logic, added chatbot from _BotSearch_ field|
|     |   Edit: set _BotSearch_ field to _BotPress.com_ (based on model: _ChatGPT_)|
|     |   Edit:  In _الرئيسية_ p., in _SearchBarRow_ _SearchBar_ logic, to reflect last step changes|
|     |   Edit:  In _الرئيسية_ p., in _EntityList_ visibility, to reflect last step changes|
|     |   Edit:  In _الرئيسية_ p., in _EntityList_, added sharing of current text via native share dialog|
  
</details>

<details>
<summary>v 0.9.14</summary>

| Header | Details |
|-----:|-----------|
|     Creation Date/Time | 14/09/2023  17:54|
|     Version | 0.9.14|
|     Version Code | 20230914|
|     AppGyver Runtime Version | 4.9.72|
|     Released OS | **Web** – **Android** - Google (aab) – **Android** - Huawei (aab) – **Android** - Amazon (aab) – **Windows** - Amazon (aab) – **Android** - UpToDown (apk) – **Android** - APKPure (apk) – **iOS** (ipa)|
|     Released Build# | 298282 – 298283 – 298283 – 298283 – 298283 – 298486 – 298486 – 298325|
|     Released | 14/09/2023|
|     Notes | Changed app file download link on _WordPress.com_ from _Box.com_ to _APKPure.com_ for smaller downloads on 20/09/2023|
|     Changes |   Add: In _الرئيسية_ p., _SelectWeb_ page variable|
|     |   Edit:  In _الرئيسية_ p., added _SelectWeb_ in _SciencesList_ logic setting as selected row's _Web_ field|
|     |   Edit:  In _الرئيسية_ p., _Osfn_ flow function added condition to WebView use, namely: checking if webpage is non-secure (i.e. uses _http_ instead of _https_) & checking several websites lists (e.g. _facebook.com_) that require opening another tap to authenticate login then continues business-as-usual, to open in external browser as both cases of which fail in WebView (by design!)|
  
</details>

<details>
<summary>v 0.9.13 (updated-sequel)</summary>

| Header | Details |
|-----:|-----------|
|     Creation Date/Time | 03/09/2023  22:34|
|     Version | 0.9.13|
|     Version Code | 20230905|
|     AppGyver Runtime Version | 4.9.72|
|     Released OS | **Web** – **Android** - Google (aab) – **Android** - Huawei (aab) – **Android** - Amazon (aab) – **Windows** - Amazon (aab) – **iOS** (ipa)|
|     Released Build# | 297142 – 297143 – 297143 – 297143 – 297143 – 297144|
|     Released | 03/09/2023|
|     Notes | _|
|     Changes |   Fix:  In _الرئيسية_ p., changed _id_ in _SciencesList_ component & logic (as _id_ in _Baserow.io_ is only an integer causing an app glitch of sorts)|
  
</details>

<details>
<summary>v 0.9.13 (updated)</summary>

| Header | Details |
|-----:|-----------|
|     Creation Date/Time | 03/09/2023  12:19|
|     Version | 0.9.13|
|     Version Code | 20230904|
|     AppGyver Runtime Version | 4.9.72|
|     Released OS | **Web** – **Android** - Google (aab) – **Android** - Huawei (aab) – **Android** - Amazon (aab) – **Windows** - Amazon (aab) – **iOS** (ipa)|
|     Released Build# | 297118 – 297119 – 297119 – 297119 – 297119 – 297120|
|     Released | 03/09/2023|
|     Notes | Some proxies (e.g. old _Kerio_) may cause Cross-Origin Resource Sharing (CORS) issues to using _Baserow.io_ as _https://baserow.io_ can't even open as a webpage|
|     Changes |   Edit: Moved used databases from _Airtable.com_ to _Baserow.io_ ..., _SearchBar_, _InputTools_|
  
</details>

<details>
<summary>v 0.9.13</summary>

| Header | Details |
|-----:|-----------|
|     Creation Date/Time | 03/09/2023  02:36|
|     Version | 0.9.13|
|     Version Code | 20230903|
|     AppGyver Runtime Version | 4.9.72|
|     Released OS | **Web** – **Android** - Google (aab) – **Android** - Huawei (aab) – **Android** - Amazon (aab) – **Windows** - Amazon (aab) – **iOS** (ipa)|
|     Released Build# | 297097 – 297098 – 297098 – 297098 – 297098 – 297099|
|     Released | 03/09/2023|
|     Notes | _|
|     Changes |   Fix: In _الرئيسية_ p., edited _i360dbsVar_ & _i360dbcVar_ data variables logic to stop auto data refresh thus stop consuming service calls quota (as _i360kVar_; see v0.9.9)|
|     |   Del: _Reset compass_ installed logic|
|     |   Edit: Moved used databases from _Airtable.com_ to _Baserow.io_ due to new limitations imposed on free plan, mainly on API calls, & changed necessary app changes, namely in _الرئيسية_ p.: _i360dbcVar_ data variable, _SciencesList_, _OSIcon_, page logic<s>, _SearchBar_, _InputTools_</s>|
  
</details>

<details>
<summary>v 0.9.12</summary>

| Header | Details |
|-----:|-----------|
|     Creation Date/Time | 23/08/2023  17:26|
|     Version | 0.9.12|
|     Version Code | 20230825|
|     AppGyver Runtime Version | 4.9.72|
|     Released OS | **Web** – **Android** - Google (aab) – **Android** - Huawei (aab) – **Android** - Amazon (aab) – **Windows** - Amazon (aab) – **iOS** (ipa)|
|     Released Build# | 295784 – 295927 – 295927 – 295927 – 295927 – 295786|
|     Released | 23/08/2023|
|     Notes | _|
|     Changes |   Edit: In _الرئيسية_ p., in _SearchBar_ showed _exclamation_ icon if _SearchBar_ value is empty for _EntitySearch=False_|
|     |   Edit: In _الرئيسية_ p., in _SciencesList_, changed text align (orientation) to right for _No Data_|
|     |   Add: In _الرئيسية_ p., _ScrollView_ & moved _SciencesList_ inside it, to enable scrolling of the list without the whole page, with dimensions to better fit screen size, namely: Width=Grow to width; Height=Screen viewport height - 200!|
  
</details>

<details>
<summary>v 0.9.11</summary>

| Header | Details |
|-----:|-----------|
|     Creation Date/Time | 23/08/2023  00:29|
|     Version | 0.9.11|
|     Version Code | 20230823|
|     AppGyver Runtime Version | 4.9.72|
|     Released OS | **Web** – **Android** - Google (aab) – **Android** - Huawei (aab) – **Android** - Amazon (aab) – **Windows** - Amazon (aab) – **iOS** (ipa)|
|     Released Build# | 295669 – 295670 – 295670 – 295670 – 295670 – 295671|
|     Released | 23/08/2023|
|     Notes | _|
|     Changes |   Edit: In _الرئيسية_ p., change _Web_ icon from _globe_ to data variable _WebIcon_ from _i360dbcVar_ data in _SciencesList_ & _OSIcon_, for better dynamic consistency between the two!|
|     |   Add: In _المتصفح_ p., _InteractionRow_, navigation button, namely: _Refresh_|
  
</details>

<details>
<summary>v 0.9.10 (updated)</summary>

| Header | Details |
|-----:|-----------|
|     Creation Date/Time | 15/08/2023  09:31|
|     Version | 0.9.10|
|     Version Code | 20230815|
|     AppGyver Runtime Version | 4.9.72|
|     Released OS | **Web** – **Android** - Google (aab) – **Android** - Huawei (aab) – **Android** - Amazon (aab) – **Windows** - Amazon (aab) – **iOS** (ipa)|
|     Released Build# | 294743 – 294700 – 294700 – 294700 – 294700 – 294707|
|     Released | 15/08/2023|
|     Notes | _|
|     Changes |   Add: In _الرئيسية_ p., in _AppSupportRow_ _AppDeveloper_ text to separate app.'s version from developer info. for better visibility|
  
</details>

<details>
<summary>v 0.9.10</summary>

| Header | Details |
|-----:|-----------|
|     Creation Date/Time | 10/08/2023  15:11|
|     Version | 0.9.10|
|     Version Code | 20230810|
|     AppGyver Runtime Version | 4.9.72|
|     Released OS | **Web** – **Android** - Google (aab) – **Android** - Huawei (aab) – **Android** - Amazon (aab) – **Windows** - Amazon (aab) – **iOS** (ipa)|
|     Released Build# | 294344 – 294332 – 294332 – 294332 – 294332 – 294334|
|     Released | 10/08/2023|
|     Notes | _|
|     Changes |   Edit: _i360t_ data resource by switch _from_/_to_ from _ar_/_en_ to _en_/_ar_, respectively; as _Bing Entity Search_ supported Arabic enquiries after _Bing_ incorporated OpenAI's ChatGPT into its services|
|     |   Edit: In _الرئيسية_ p., change _Web_ icon from _dribbble_ to _globe_ in _SciencesList_ & _OSIcon_|
|     |   Edit: In _الرئيسية_ p., in _SearchBar_ relinked logic to show _tripadvisor_ icon while entity searching even without translation|
|     |   Edit: In _الرئيسية_ p., in _HTTPflow_ added showing toast message in case of _HTTP Request_ error output & linked it to second| (error) output|
|     |   Add: _EntityQueryTermOld_ Page Variable linked to old _SearchBar_ value|
|     |   Edit: In _الرئيسية_ p., in _SearchBar_ showed _exclamation_ icon if _SearchBar_ value is empty or unchanged (w.r.t. _EntityQueryTermOld_) for _EntitySearch=True_|
|     |   Fix: In _i360k_ data resource, removed query parameter _cc=SA_|
  
</details>

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
|     Changes |   Edit: In _i360k_ data resource, regenerated first key used by app to disable live version & enable isolated testing of under development version|
|     |   Fix: In _الرئيسية_ p., edited _i360kVar_ data variable logic to refresh data upon _EntityQueryTerm_ change (see _https://answers.sap.com/questions/13646962/appgyver-how-to-pass-url-filter-parameters-in-rest.html_ & _https://blogs.sap.com/2022/05/22/dadiambored-no-code-challenge/_) only & stop auto data refresh thus stop consuming service calls quota (see _https://answers.sap.com/questions/13648115/appgyver-how-to-stop-rest-api-calls-done-automatic.html_)|
|     |   Edit: In _الرئيسية_ p., in _SearchBar_ changed all _self.value_ to _Trim_WhiteSpace(self.value)_|
|     |   Edit: In _الرئيسية_ p., in _SearchBar_ added logic to check language (using Arabic can't be Lower-/Upper-cased) & hence translate from English to Arabic (if needed), instead of the other way around|
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
|     Changes |   Fix: In _الرئيسية_ p., in _SearchBar_, reordered logic to set _EntityQueryTerm_ before changing _EntitySearch_ icon as the earlier reads output of another node _HTTPflow_|
|     |   Edit: Renamed _[...]Errata_ to _[...]Appendix_ in: _i360db.xlsx - Sciences_ Airtable, _i360dbs_ data resource schema, & app. components|
|     |   Fix: _i360t_ data resource by changing _Record Properties_ (a.k.a. body) binding type to _Formula_ (instead of default: _Object with properties_) then setting it to: `[{"Text":"صلاح الدين الأيوبي"}]` ***(functional)***|
|     |   Add: _i360tVar_ data variable, type: 'New data record', based on _i360t_ data resource ***(unfunctional)***|
|     |   Add: _EntityQueryTermRaw_ Page Variable linked to _i360kVar_ _Record properties_|
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
|     Changes |   Add: _WebErrata_ app. variable of errata of related Web URL|
|     |   Edit: In _الرئيسية_ p., in _SciencesList_, added _WebErrata_ setting logic|
|     |   Add: In _المتصفح_ p., in _InteractionRow_, navigation button, namely: _Errata_, setting _WebView_ URL to _WebErrata_, visible only if exists|
|     |   Edit: In _المتصفح_ p., in _InteractionRow_, adjusted cells widths in layout for better icons view|
  
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
|     Changes |   Edit: In _الرئيسية_ p., in _SearchBar_, added _HTTP request_ logic for _EntitySearch_|
|     |   Edit: In _الرئيسية_ p., in _SearchBar_, used _HTTP request_ for _Translator_ & _Entity Search_ to display error message(s), if any|
|     |   Add: In _الرئيسية_ p., in _SearchBar_, _HTTPrequest_ flow function (based on that of _Translator_ as it's more options), named _HTTPflow_, combining _HTTP request_ logic, with error handling mechanism|
  
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
|     Changes |   Add: In _المتصفح_ p., _CurrentWebView_ page variable of current webpage as Web URL|
|     |   Fix: In _المتصفح_ p., set _Share_ to _CurrentWebView_, instead of _WebParam_!|
|     |   Edit: In _المتصفح_ p., in _WebView_, set _CurrentWebView_ to customized _onChangeLocation_ _Receive event_ outputs|
|     |   Add: In _المتصفح_ p., _WebViewPages_ page variable of browsed webpages as List of Web URLs| 
|     |   Edit: In _المتصفح_ p., in _WebView_, added _CurrentWebView_ to _WebViewPages_ incrementally, only if missing|
|     |   Add: In _المتصفح_ p., _CurrentWebViewIndex_ page variable of current webpage index in _WebViewPages_ as Number|
|     |   Add: In _المتصفح_ p., set _Share_ to _CurrentWebView_, instead of _WebParam_!|
|     |   Add: In _المتصفح_ p., in _InteractionRow_, navigation buttons, namely: _GoBack_, _GoForward_, _Home_ icons, setting _WebView_ URL to previous, next, home items in _WebViewPages_ list, respectively|
  
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
|     Changes |   Edit: In _الرئيسية_ p., in _SearchBar_, changed _EntitySearch_ _checkedIcon_ to _language_ while translating|
|     |   Edit: In _الرئيسية_ p., in _SearchBar_, changed _EntitySearch_ _checkedIcon_ to _tripadvisor_ (owl as a symbol of knowledge) while entity searching, with 500ms delay|
|     |   Edit: In _الرئيسية_ p., changed _Web_ icon from _window-maximize_ to _dribbble_ (~globe) in _SciencesList_ & _OSIcon_|
  
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
|     |   Add: _EntityQueryTerm_ Page Variable linked to _i360kRecords'_ query term _q_|
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
