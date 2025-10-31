# i360
إi360 تطبيق إسلامي موسوعي للعلوم الإسلامية الأساسية بشكل متكامل مختصر بسيط
• https://i36O.wordpress.com

<details>
<summary>v 0.12.4</summary>

| Header | Details |
|-----:|-----------|
|     Creation Date/Time | 31/10/2025  23:03|
|     Version | 0.12.4|
|     Version Code | 20251031|
|     Runtime Version | 4.17.60|
|     Released OS | **Web**|
|     Released Date | 31/10/2025|
|     Notes | _|
|     Changes |   Edit: In _الرئيسية_ p., _SearchBar_, moved _QuranIdCheckbox_ cell, Y-rotated 180°, next to _SearchIcon_ cell|
|     |   Edit: In _الرئيسية_ p., _SearchBar_, set _QuranIdCheckbox_ cell visibility to NOT(isMobile)|
|     |   Edit: In _الرئيسية_ p., _SearchBar_, set _SearchIcon_ cell visibility to (isMobile)|

| Header | Details |
|-----:|-----------|
|     Creation Date/Time | 24/08/2025  23:07|
|     Version | 0.12.4|
|     Version Code | 20250824|
|     Runtime Version | 4.17.0|
|     Released OS | **Web** – **Android** - Google (aab) – **Android** - Huawei (aab) – **Android** - APKPure (_apk_) – **iOS** (ipa)|
|     Released Date | 24/08/2025|
|     Notes | [App must target Android 15 (API level 35) or higher](https://support.google.com/googleplay/android-developer/answer/1192687)|
|     Changes |   Edit: In _الرئيسية_ p., moved logic setting _WebsiteStatus_ App Variable to Page logic's _on Data 'i360dbcVar' changed_ from _SciencesList_ list (for better variables setting consistency)|
|     |   Edit: In _الرئيسية_ p., in _Appendix_ button logic, changed dialog title text to _تفسير آية_ from _آية_|
|     |   Fix: In _الرئيسية_ p., _fWebBrowser_ flow logic, added nulling _ScienceMinorId_ when opening _WebView_ to avoid wrong mismatches (loading _i360dbqVar_), as _WebAppendix_|
|     |   Edit: In _المتصفح_ p. logic, changed resetting _i360dbqPages_ to 1 on page mounted|
|     |   Edit: In _الرئيسية_ p., renamed _fEdition_ & _fVersion_ flows to _fInfo_Edition_ & _fInfo_Version_, respectively|
|     |   Edit: In _i360db.xlsx - Complements_, added GenAI chatbot _Huawei_CustomSearch_ field & reloaded DB schema|
|     |   Edit: In _الرئيسية_ p., _SearchBar_ logic, in _fSearchCustom_ flow logic then in _fWebBrowser_ URL, added custom search from _Huawei_CustomSearch_ field, for China|

</details>

<details>
<summary>v 0.12.3</summary>

| Header | Details |
|-----:|-----------|
|     Creation Date/Time | 14/06/2025  01:20|
|     Version | 0.12.3|
|     Version Code | 20250613|
|     Runtime Version | 4.15.15|
|     Released OS | **Web** – **Android** - Google (aab) – **Android** - Huawei (aab) – **Android** - APKPure (_apk_) – **iOS** (ipa)|
|     Released Date | 14/06/2025|
|     Notes | _|
|     Changes |   Edit: In _الرئيسية_ p., in _Appendix_ button logic, changed placeholder text to _[آية#].[سورة#]_ from _[سورة#].[آية#]_|
|     |   Edit: In _المتصفح_ p., _i360dbqVar_ data variable logic, reduced _i360dbqPages_ counter toast message show duration from 200ms to 100ms|
|     |   [ ↓ Adding _Quran Exegesis_ to Web ↓ ]|
|     |   Add: In _الرئيسية_ p., _isMobile_ App. variable for Android / iOS systems|
|     |   Edit: In _fExegesis_ flow logic, changed (unnecessary) inputs (for Prompt text) to static|
|     |   Edit: In _المتصفح_ p., changed _i360dbqPages_, _QuranID_, _QuranChapter_, _QuranVerse_, _ExegesisURL_, _i360dbqPages_ to App. Variable from Page Variable|
|     |   Edit: renamed _QuranID_ App. Variable to _QuranId_|
|     |   Edit: In _fExegesis_ flow logic, changed according to variables type change|
|     |   Edit: In _fExegesis_ flow logic, moved viewing _ExegesisURL_ outside flow to enable _Web/WebView_ use|
|     |   Edit: In _المتصفح_ p., in _Appendix_ button logic, added viewing _ExegesisURL_ in _WebView_|
|     |   Add: In _المتصفح_ p., _fi360dbqVar_ flow function for loading _i360dbq_ data (_i360dbqVar_ logic), introduced in version 0.11.0|
|     |   Edit: In _الرئيسية_ p., moved logic setting _i360dbqEOF_ App Variable to _i360dbcVar.i360dbqEOF_ to Page logic's _on Data 'i360dbcVar' changed_ from _SciencesList_ list|
|     |   Add: In _الرئيسية_ p., _i360dbqVar_ data variable, as in _المتصفح_ p., with added logic to wait for _i360dbqEOF_ App Variable setting|
|     |   Edit: In _المتصفح_ p. logic, added resetting _i360dbqPages_ to 1 on page focus|
|     |   Add: In _الرئيسية_ p., _QuranIdRow_, including _QuranIdBar_ & _QuranIdIcon_, as _SearchBar_ & _SearchIcon_ respectively, as _Prompt text_ doesn't support _Web_!|
|     |   Add: In _الرئيسية_ p., _fSearchExegesis_ flow function for searching Quran Exegesis to use in Web (found in _SearchBar_ logic), introduced in version 0.12.3|
|     |   Add: In _الرئيسية_ p., _fSearchCustom_ flow function for custom searching app. books (found in _SearchBar_ logic), introduced in version 0.9.0|
|     |   Edit: In _الرئيسية_ p., _SearchBar_ logic, combining _fSearchExegesis_ & _fSearchCustom_ by _QuranIdCheckbox_ value condition|
|     |   Add: In _الرئيسية_ p., _QuranIdCheckbox_ logic, flows to change _SearchBar_ placeholder & _SearchIcon_ by _QuranIdCheckbox_ value condition|
|     |   Del: In _الرئيسية_ p., _QuranIdRow_ being replaced by _SearchRow_|
|     |   Edit: In _الرئيسية_ p., _SciencesList_ _List item_, changed padding to 16px for right & left from 8px|
|     |   Add: In _الرئيسية_ p., _fInfo_ flow merging _fEdition_ & _fVersion_ flows, by exposing used variables & unifying used condition|

</details>

<details>
<summary>v 0.12.2</summary>

| Header | Details |
|-----:|-----------|
|     Creation Date/Time | 26/05/2025  21:10|
|     Version | 0.12.2|
|     Version Code | 20250526|
|     Runtime Version | 4.15.7|
|     Released OS | **Web** – **Android** - Google (aab) – **Android** - Huawei (aab) – **Android** - APKPure (_apk_) – **iOS** (ipa)|
|     Released Date | 26/05/2025|
|     Notes | _|
|     Changes |   Fix: In _المتصفح_ p., _i360dbqVar_ data variable logic, missing link to close loop & some rearrangements!|
|     |   Edit: In _المتصفح_ p., set _i360dbqPages_ initial value (manually) to 1|
|     |   Edit: In _المتصفح_ p., set _i360dbqEOF_ initial value (manually) to 11 (as per data)|
|     |   Edit: In _المتصفح_ p., _i360dbqVar_ data variable logic, added _i360dbqPages_ counter toast message|
|     |   Edit: In _المتصفح_ p., _i360dbqVar_ data variable logic, changed _Appendix_ icon to _spinner_, from _paperclip_ during loading data|
|     |   Edit: In _المتصفح_ p., _i360dbqVar_ data variable logic, added condition to only load data for _ScienceMinorId=1.010_ (Quran)|
|     |   Edit: In _i360db.xlsx - Complements_, added _i360dbqEOF_ numeric field & reloaded DB schema|
|     |   Del: _i360dbqEOF_ Page Variable|
|     |   Add: _i360dbqEOF_ App Variable|
|     |   Edit: In _الرئيسية_ p., in _SciencesList_ list, added logic setting _i360dbqEOF_ App Variable to _i360dbcVar.i360dbqEOF_|
|     |   Edit: In _المتصفح_ p., _i360dbqVar_ data variable logic, changed _i360dbqEOF_ from Page to App Variable|

</details>

<details>
<summary>v 0.12.1</summary>

| Header | Details |
|-----:|-----------|
|     Creation Date/Time | 25/05/2025  23:39|
|     Version | 0.12.1|
|     Version Code | 20250525|
|     Runtime Version | 4.15.7|
|     Released OS | **Web** – **Android** - Google (aab) – **Android** - Huawei (aab) – **Android** - APKPure (_apk_) – **iOS** (ipa)|
|     Released Date | 25/05/2025|
|     Notes | _|
|     Changes |   Edit: In _المتصفح_ p., _NavigateBack_ changed to navigate back to app root p. from navigate back (only); via Add: _Navigate back to root_ flow component|
|     |   Edit: In _الرئيسية_ p., _SciencesList_ _Group header_, changed padding to 8px for all sides except bottom 4px|
|     |   Edit: In _الرئيسية_ p., _SciencesList_ _List item_, changed padding to 8px for right & left & to 4px for top & bottom|

</details>

<details>
<summary>v 0.12.0</summary>

| Header | Details |
|-----:|-----------|
|     Creation Date/Time | 21/05/2025  21:59|
|     Version | 0.12.0|
|     Version Code | 20250521|
|     Runtime Version | 4.14.9|
|     Released OS | **Web** – **Android** - Google (aab) – **Android** - Huawei (aab) – **Android** - APKPure (_apk_) – **iOS** (ipa)|
|     Released Date | 21/05/2025|
|     Notes | _|
|     Changes |   Del: In _الرئيسية_ p., _EntityList_, _StarRating_|
|     |   Del: _Tap component_ logic canvas|
|     |   Del: _i360k_ data resource linked to _Bing Entity Search_, a.k.a. _Bing.Search.v7_|
|     |   Del: _i360kVar_ data variable linked to _i360k_ data resource|
|     |   Del: _iconSearchExternal_ Page Variable|
|     |   Del: _SearchSource_, _SearchSourceOld_ Page Variables|
|     |   Del: In _الرئيسية_ p., in _SearchBar_, _SearchSource_, _SearchSourceOld_, _i360kVar_ logic|
|     |   Edit: In _الرئيسية_ p., in _SearchBar_, reconnected logic nodes accordingly|
|     |   [ ↑ see version 0.11.3 changes ↑ ]|
|     |   Edit: In _الرئيسية_ & _المتصفح_ p., changed padding to 8px for all sides from 16px|
|     |   Edit: In _الرئيسية_ p. logic, changed toast message _تحميل البيانات_ position to -144 from -20|
|     |   Edit: In _الرئيسية_ p., _SciencesList_ logic, changed toast message _هناك ملحق_ position to -144 from -20|
|     |   Edit: In _الرئيسية_ p., _SciencesList_ _List item_, changed padding to 4px for all sides from 8px|
|     |   Edit: In _الرئيسية_ p., _OSRow_ _VersionMenu_ & _OSIcon_, changed cells' padding to 8px for right & left from 0|
|     |   Edit: In _الرئيسية_ p., _OSRow_ _OS_WebToggle_ & _MobileServicesToggle_, changed padding to 8px for right & left from 0|
|     |   Edit: In _الرئيسية_ p., _OSRow_ _OS_WebToggle_ & _MobileServicesToggle_, changed Label text align to center from left|
|     |   Edit: In _الرئيسية_ p., _OSRow_ _OS_WebToggle_ & _MobileServicesToggle_, changed Toggle padding to 8px for left from 16px|
|     |   Edit: In _الرئيسية_ p., _SearchBarRow_ _SearchBar_, changed padding to 8px for right from 12px & to 16px for left from 20px|
|     |   Edit: In _الرئيسية_ p., _SearchBarRow_ _InputTools_ & _BotSearchIcon_, changed cells' padding to 4px for right & left from 0|
|     |   Edit: In _المتصفح_ p., _HeaderRow_ & _InteractionRow_, changed all filled cells' padding to 4px for right & left from 0|
|     |   Edit: In _المتصفح_ p., changed _WebsiteStatusReport_ icon to _heartbeat_ in _Font Awesome_ icon set from _electronic-medical-record_ in _Fiori Icons_ icon set|

</details>

<details>
<summary>v 0.11.3</summary>

| Header | Details |
|-----:|-----------|
|     Creation Date/Time | 15/05/2025  11:10|
|     Version | 0.11.3|
|     Version Code | 20250515|
|     Runtime Version | 4.12.237|
|     Released OS | **Web** – **Android** - Google (aab) – **Android** - Huawei (aab) – **Android** - APKPure (_apk_) – **iOS** (ipa)|
|     Released Date | _|
|     Notes | _|
|     Changes |   Add: In _المتصفح_ p., _fExegesis_ flow function for displaying Quran Exegesis, introduced in version 0.11.0|
|     |   Edit: In _الرئيسية_ p., disabled _SearchIcon_ component tap event as only _Internal Custom_ (not with _Bing.CustomSearch_) functions whereas _External Knowledge Graph Entity_ (depending on _Bing Entity Search_, a.k.a. _Bing.Search.v7_) not, as both Bing Search APIs will retire on 11/08/2025! [FYI: _EntityList_ used to display the latter's results is kept]|
|     |   Edit: In _الرئيسية_ p., _StarRating_ made invisible for same reason as: disabled _SearchIcon_!|

</details>

<details>
<summary>v 0.11.2</summary>

| Header | Details |
|-----:|-----------|
|     Creation Date/Time | 20/04/2025  11:10|
|     Version | 0.11.2|
|     Version Code | 20250420|
|     Runtime Version | 4.12.232|
|     Released OS | **Web** – **Android** - Google (aab) – **Android** - Huawei (aab) – **Android** - APKPure (_apk_) – **iOS** (ipa)|
|     Released Date | 20/04/2025|
|     Notes | _|
|     Changes |   Fix: In _الرئيسية_ p., _fWebBrowser_ flow logic, added nulling _WebAppendix_ when opening _WebView_ to avoid wrong mismatches|
|     |   Fix: In _الرئيسية_ p., _fEdition_ flow logic, changed if condition _DATETIME_IS_AFTER_ function to _DATETIME_DIFFERENCE… != 0_ to ensure working properly|
|     |   Edit: In _الرئيسية_ p., _fEdition_ flow logic, changed Alert from _تمت إضافة / تعديل محتوى مُحدث لإثراء تجربتك. شكرًا لك..._ to _تمت إضافة / تعديل محتوى مُحدَّث لإثراء تجربتك_|
|     |   Edit: In _الرئيسية_ p., _fVersion_ flow logic, changed Alert from _ أطلق إصدار مُحدث لإثراء تجربتك. شكرًا لك..._ to _تم إطلاق إصدار مُحدَّث لإثراء تجربتك_|
|     |   Fix: In _الرئيسية_ p., _fVersion_ flow logic, changed Alert Dismiss button label from _OK_ to _موافق_|
|     |   Edit: In _الرئيسية_ p. logic, reduced toast message _تحميل البيانات_ show duration from 1,000ms to 500ms|
|     |   Add: _SearchSourceOld_ Page Variable linked to old _SearchSource_ value|
|     |   Edit: In _الرئيسية_ p., in _SearchBar_ showed _exclamation_ icon if _SearchSource_ value is empty or unchanged (w.r.t. _SearchSourceOld_), in addition to previous condition: _SearchBar_ value is empty or unchanged (w.r.t. _EntityQueryTermOld_) for _EntitySearch=True_|

</details>

<details>
<summary>v 0.11.1</summary>

| Header | Details |
|-----:|-----------|
|     Creation Date/Time | 04/04/2025  20:12|
|     Version | 0.11.1|
|     Version Code | 20250404|
|     Runtime Version | 4.12.227|
|     Released OS | **Web** – **Android** - Google (aab) – **Android** - Huawei (aab) – **Android** - APKPure (_apk_)|
|     Released Date | 04/04/2025|
|     Notes | _|
|     Changes |   Fix: In _الرئيسية_ p., in _Appendix_ button logic, changed placeholder text from _<سورة#>.<آية#>_ to _[سورة#].[آية#]_ to avoid Arabic text orientation mishaps!|

| Header | Details |
|-----:|-----------|
|     Creation Date/Time | 03/04/2025  12:39|
|     Version | 0.11.1|
|     Version Code | 20250403|
|     Runtime Version | 4.12.220|
|     Released OS | **Web** – **Android** - Google (aab) – **Android** - Huawei (aab) – **Android** - APKPure (_apk_) – **iOS** (ipa)|
|     Released Date | 03/04/2025|
|     Notes | _|
|     Changes |   Fix: In _الرئيسية_ p. logic, corrected _i360dbcRecord_ data variable to _i360dbcVar_|
|     |   Edit: In _الرئيسية_ p. logic, added toast message _تحميل البيانات_ on _Page Mounted_ event|
|     |   Edit: In _الرئيسية_ p., in _SciencesList_ logic, changed toast message from _يوجد ملحق للصفحة_ to _هناك ملحق_|
|     |   Fix: In _الرئيسية_ p. logic, _i360Edition_, _i360Version_ flows logic to read from _i360EditionNode_, _i360VersionNode_, respectively, as originally designed before creating _flow_|

| Header | Details |
|-----:|-----------|
|     Creation Date/Time | 01/04/2025  20:01|
|     Version | 0.11.1|
|     Version Code | 20250401|
|     Runtime Version | 4.12.220|
|     Released OS | **Web** – **Android** - Google (aab) – **Android** - Huawei (aab) – **Android** - APKPure (_apk_)|
|     Released Date | 01/04/2025|
|     Notes | _|
|     Changes |   Add: In _المتصفح_ p., _i360dbqEOF_ (EOF=End-of-File) Page Variable|
|     |   Fix: In _المتصفح_ p., _i360dbqVar_ data variable logic, add _i360dbqEOF_ to designate end (max.) of _i360dbqVar_ Pages to terminate new non-existent pagination (stop continuously loading _i360dbq_ records in vain)|

</details>

<details>
<summary>v 0.11.0</summary>

| Header | Details |
|-----:|-----------|
|     Creation Date/Time | 30/03/2025  12:45|
|     Version | 0.11.0|
|     Version Code | 20250330|
|     Runtime Version | 4.12.220|
|     Released OS | **Web** – **Android** - Google (aab) – **Android** - Huawei (aab) – **Android** - APKPure (_apk_) – **iOS** (ipa)|
|     Released Date | 30/03/2025|
|     Notes | _|
|     Changes |   Add: _ScienceMinorId_ App Variable|
|     |   Edit: In _الرئيسية_ p., in _SciencesList_ logic, added setting _ScienceMinorId_ App Variable to selected item _ScienceMinorId_|
|     |   Add: _i360dbq_ data resource linked to _i360db.xlsx - QuranIndexSum_ Baserow using REST API with API key with _page_ as an unset query parameter defaulted to 1 (to enabled query pagination, i.e. loading different pages of _i360dbq_ records)|
|     |   Add: In _المتصفح_ p., _QuranID_, _QuranChapter_, _QuranVerse_, _ExegesisURL_, _i360dbqPages_ Page Variables|
|     |   Add: In _المتصفح_ p., _i360dbqVar_ data variable, type: 'Collection of data records', based on _i360dbq_ data resource using _i360dbqPages_ incrementally to load all pages|
|     |   Edit: In _المتصفح_ p., in _Appendix_ button logic, added condition for _ScienceMinorId=1.010_ (Quran) to open differently|
|     |   Edit: In _المتصفح_ p., in _Appendix_ button logic, added setting _QuranID_, _QuranChapter_, _QuranVerse_ MANUALLY using _Input Text_ prompt with default keybad|
|     |   Edit: In _المتصفح_ p., in _Appendix_ button logic, added setting _ExegesisURL_ from selected corresponding _i360dbqVar_ records|

</details>

<details>
<summary>v 0.10.10</summary>

| Header | Details |
|-----:|-----------|
|     Creation Date/Time | 23/01/2025  21:51|
|     Version | 0.10.10|
|     Version Code | 20250123|
|     Runtime Version | 4.12.166|
|     Released OS | **Web** – **Android** - Google (aab) – **Android** - Huawei (aab) – **Android** - Amazon (aab) – **Windows** - Amazon (aab) – **Android** - APKPure (_apk_) – **iOS** (ipa)|
|     Released Date | 23/01/2025|
|     Notes | _|
|     Changes |   Fix: In _i360dbs_ data resource, changed _WebAppendix_, _BotKB_, _CustomSearchAIKBlessBotKB_ value data type to _web URL_ from _text_|
|     |   Edit: In _الرئيسية_ p., in _SciencesList_ list logic, rewired setting _WebAppendix_ App Variable to be between setting _SelectWeb_ App Variable & _fOS_ flow from after _SelectWeb_ _Open page_ & _Open URL_|
|     |   Edit: In _الرئيسية_ p., in _SciencesList_ list logic, added _Open URL_ for _WebAppendix_ in case of _SelectWeb_ _Open URL_ (to show _WebAppendix_ in case of not using _WebView_!)|
|     |   Edit: In _الرئيسية_ p., _i360Privacy_ item message modified message to indicate that no _(non-functional)_ data is collected or shared!|
|     |   Edit: In _المتصفح_ p., _NavigateBack_ changed to navigate back (only) from navigate back to app root p.; to Del: _Navigate back to root_ flow component|

</details>

<details>
<summary>v 0.10.9</summary>

| Header | Details |
|-----:|-----------|
|     Creation Date/Time | 12/01/2025  23:51|
|     Version | 0.10.9|
|     Version Code | 20250112|
|     Runtime Version | 4.12.166|
|     Released OS | **Web** – **Android** - Google (aab) – **Android** - Huawei (aab) – **Android** - Amazon (aab) – **Windows** - Amazon (aab) – **Android** - APKPure (_apk_) – **iOS** (ipa)|
|     Released Build# | 48149 – 48150 – _48150_ – _48150_ – _48150_ – _48150_ – 48151|
|     Released Date | 12/01/2025|
|     Notes | _|
|     Changes |   Edit: In _الرئيسية_ p., grouped Privacy related flow in _fPrivacy_|
|     |   Edit: In _الرئيسية_ p., grouped Edition related flow in _fEdition_|
|     |   Edit: In _الرئيسية_ p., grouped Version related flow in _fVersion_|
|     |   Edit: In _الرئيسية_ p., renamed flow functions: _Osfn_ to _fOS_, _HTTPflow_ to _fHTTP_, _WebBrowserflow_ to _fWebBrowser_|
|     |   Edit: In _الرئيسية_ p., in _SearchBar_ logic, named flow functions: Translator's _HTTPflow_ to _httpTranslator_, EntitySearch's _HTTPflow_ to _httpEntitySearch_|
|     |   Edit: In _الرئيسية_ p., in _SearchBarRow_ _SearchIcon_, Y-rotated 180° (so that question mark be Arabic)|
|     |   Edit: In _الرئيسية_ p., in _SearchBarRow_ _SearchBar_ logic, showing _question_ icon, replaced exact matching I/O _Entity Search_ terms by _CONTAINS_ of input in output or vice versa!|
|     |   Del: Unused Installed _View Components_|
|     |   Del: _i360g_ data resource linked to _Vectara.com_|
|     |   Fix: In _الرئيسية_ p. mounting, initially set _SearchIcon_ to _spinner_ again!|

</details>

<details>
<summary>v 0.10.8</summary>

| Header | Details |
|-----:|-----------|
|     Creation Date/Time | 24/12/2024  10:25|
|     Version | 0.10.8|
|     Version Code | 20241224|
|     Runtime Version | 4.12.166|
|     Released OS | **Web** – **Android** - Google (aab) – **Android** - Huawei (aab) – **Android** - Amazon (aab) – **Windows** - Amazon (aab) – **Android** - APKPure (_apk_)|
|     Released Build# | 47188 – 47186 – _47186_ – _47186_ – _47186_ – _47186_|
|     Released Date | 24/12/2024|
|     Notes | _|
|     Changes |   Edit: In _الرئيسية_ p., in _SearchBarRow_ _SearchIcon_ logic, changed aforementioned search icons binding type from _Icon_ to _Formula_; with removing _الرئيسية_ p. logic mounting used to initially set _SearchIcon_ to _moon_!|

| Header | Details |
|-----:|-----------|
|     Creation Date/Time | 23/12/2024  01:30|
|     Version | 0.10.8|
|     Version Code | 20241223|
|     Runtime Version | 4.12.166|
|     Released OS | **Web** – **Android** - Google (aab) – **Android** - Huawei (aab) – **Android** - Amazon (aab) – **Windows** - Amazon (aab) – **Android** - APKPure (_apk_) – **iOS** (ipa)|
|     Released Build# | 47121 – 47119 – _47119_ – _47119_ – _47119_ – _47119_ – 47120|
|     Released Date | 23/12/2024|
|     Notes | _|
|     Changes |   Edit: In _الرئيسية_ & _المتصفح_ p., changed page padding to 16px for both top & bottom to match right & left|
|     |   Edit: In _الرئيسية_ p., in _SearchBarRow_ _SearchBar_ logic, added showing _question_ icon for unmatching I/O _Entity Search_ terms|
|     |   Edit: In _الرئيسية_ p., disabled show spinner on page load, as _المتصفح_ p.|
|     |   Add: In _الرئيسية_ p., _iconSearchBot_, _iconSearchInternal_, _iconSearchExternal_ page variables, as Text, corresponding to icons of: _Internal Knowledge Graph Entity Bot_ Searches, _Internal Custom_, _External Knowledge Graph Entity_; with initial values: magic, compress, expand (without quotations!)|
|     |   Edit: In _الرئيسية_ p., in _SearchBarRow_ _SearchBar_ & _SearchIcon_ logic, changed constant aforementioned search icons to corresponding page variables; with _الرئيسية_ p. logic mounting used to initially set _SearchIcon_ to _moon_!|

</details>

<details>
<summary>v 0.10.7</summary>

| Header | Details |
|-----:|-----------|
|     Creation Date/Time | 09/12/2024  19:40|
|     Version | 0.10.7|
|     Version Code | 20241209|
|     Runtime Version | 4.12.156|
|     Released OS | **Web** – **Android** - Google (aab) – **Android** - Huawei (aab) – **Android** - Amazon (aab) – **Windows** - Amazon (aab) – **Android** - APKPure (_apk_) – **iOS** (ipa)|
|     Released Build# | 46126 – 46127 – _46127_ – _46127_ – _46127_ – _46127_ – 46128|
|     Released Date | 09/12/2024|
|     Notes | _|
|     Changes |   Edit: In _i360db.xlsx - Complements_, added _URIschemes_ field (_http/https_, _mailto_, _geo_, ...) & reloaded DB schema|
|     |   Edit: In _الرئيسية_ p., in _SciencesList_ list, _Osfn_ flow function, added condition to WebView use to check URI scheme replacing _http_ only condition by more generic form|
|     |   Edit: changed non-clickable components background color to _App Background_ from _Level 1 Background_!|
|     |   Edit: In _الرئيسية_ p., in _SearchBarRow_ _SearchIcon_ logic, changed icons of: _Internal Custom_, _External Knowledge Graph Entity_ Searches to _compress_, _expand_ from _binoculars_, _external-link_|

</details>

<details>
<summary>v 0.10.6</summary>

| Header | Details |
|-----:|-----------|
|     Creation Date/Time | 21/10/2024  20:50|
|     Version | 0.10.6|
|     Version Code | 20241018|
|     Runtime Version | 4.12.108|
|     Released OS | **Android** - Google (aab) – **Android** - Huawei (aab) – **Android** - Amazon (aab) – **Windows** - Amazon (aab) – **Android** - APKPure (_apk_)|
|     Released Build# | 41683 – 41683 – _41683_ – _41683_ – _41683_|
|     Released Date | 21/10/2024|
|     Notes | [Firebase and last 4.12.107 Runtime Issues](https://community.sap.com/t5/sap-builders-discussions/firebase-and-last-4-12-107-runtime-issues/m-p/13902754)|
|     Changes |      ***(as Version Code: 20241018)***|

| Header | Details |
|-----:|-----------|
|     Creation Date/Time | 18/10/2024  21:11|
|     Version | 0.10.6|
|     Version Code | 20241018|
|     Runtime Version | 4.12.107|
|     Released OS | **Web** – **iOS** (ipa)|
|     Released Build# | 41477 – 41476|
|     Released Date | 18/10/2024|
|     Notes | _|
|     Changes |   Fix: In _الرئيسية_ p., _Osfn_ flow function, removed unnecessary input(s)|
|     |   Fix: In _الرئيسية_ p., _HTTPflow_, _WebBrowserflow_ flow functions, unified capitalization scheme & set _Value is required_ as needed|
|     |   Edit: In _i360db.xlsx - Complements_, added _WebsiteStatus_ field (as DownDetector.com) & reloaded DB schema|
|     |   Add: _WebsiteStatus_ App Variable|
|     |   Edit: In _الرئيسية_ p., in _SciencesList_ list, added logic setting _WebsiteStatus_ App Variable to _i360dbcVar.WebsiteStatus_|
|     |   Edit: In _المتصفح_ p., added _WebsiteStatusReport_ icon, as _electronic-medical-record_ in _Fiori Icons_ icon set, to _HeaderRow_ to view current website status report|

</details>

<details>
<summary>v 0.10.5</summary>

| Header | Details |
|-----:|-----------|
|     Creation Date/Time | 19/09/2024  23:45|
|     Version | 0.10.5|
|     Version Code | 20240919|
|     Runtime Version | 4.11.167|
|     Released OS | **Android** - Google (aab) – **Android** - Huawei (aab) – **Android** - Amazon (aab) – **Windows** - Amazon (aab) – **Android** - APKPure (_apk_)|
|     Released Build# | 38681 – 38681 – _38681_ – _38681_ – _38681_|
|     Released Date | 19/09/2024|
|     Notes | _|
|     Changes |   Add: _useHMSdefault_ app. variable, set to _useHMS_ first value|
|     |   Edit: In _الرئيسية_ p., _OSRow_ _OS_WebToggle_ (_useWeb_ variable), added logic to set _MobileServicesToggle_ (_useHMS_ variable) to (_isChina_ or _useHMSdefault_), i.e. to native _Google_/_Huawei_, when _web_ is chosen again|

| Header | Details |
|-----:|-----------|
|     Creation Date/Time | 16/09/2024  21:07|
|     Version | 0.10.5|
|     Version Code | 20240916|
|     Runtime Version | 4.11.167|
|     Released OS | **Android** - Google (aab) – **Android** - Huawei (aab) – **Android** - Amazon (aab) – **Windows** - Amazon (aab) – **Android** - APKPure (_apk_)|
|     Released Build# | 38355 – 38355 – 38355 – 38355 – _38355_|
|     Released Date | 16/09/2024|
|     Notes | _|
|     Changes |   Fix: In _الرئيسية_ p., _OSRow_ _OS_WebToggle_ (_useWeb_ variable), added logic to set _MobileServicesToggle_ (_useHMS_ variable) to false, i.e. to _Google_, when _web_ is chosen again. This bug dates to version 0.4.5!|

| Header | Details |
|-----:|-----------|
|     Creation Date/Time | 15/09/2024  21:32|
|     Version | 0.10.5|
|     Version Code | 20240915|
|     Runtime Version | 4.11.167|
|     Released OS | **Web** – **Android** - Google (aab) – **Android** - Huawei (aab) – **Android** - Amazon (aab) – **Windows** - Amazon (aab) – **Android** - APKPure (_apk_) – **iOS** (ipa)|
|     Released Build# | 38222 – 38223 – _38223_ – _38223_ – _38223_ – _38223_ – 38224|
|     Released Date | 15/09/2024|
|     Notes | _|
|     Changes |   Edit: In _i360db.xlsx - Complements_, added GenAI chatbot _Huawei_BotSearch_ field & reloaded DB schema|
|     |   Edit: In _الرئيسية_ p., _SearchBarRow_ _BotSearchIcon_ logic, added chatbot from _Huawei_BotSearch_ field, for China, as _InputTools_ logic|
|     |   Edit: set _BotSearch_ field to Chinese GenAI bot _ChatGLM.cn_ (based on model: _ChatGLM_); not bound to my own sources|

</details>

<details>
<summary>v 0.10.4</summary>

| Header | Details |
|-----:|-----------|
|     Creation Date/Time | 09/09/2024  20:45|
|     Version | 0.10.4|
|     Version Code | 20240909|
|     Runtime Version | 4.11.167|
|     Released OS | **Web** – **Android** - Google (aab) – **Android** - Huawei (aab) – **Android** - Amazon (aab) – **Windows** - Amazon (aab) – **Android** - APKPure (_apk_) – **iOS** (ipa)|
|     Released Build# | 37670 – 37671 – _37671_ – _37671_ – _37671_ – _37671_ – 37672|
|     Released Date | 09/09/2024|
|     Notes | _|
|     Changes |   Add: In _الرئيسية_ p., in _SearchBarRow_, _BotSearchIcon_ icon, set to _magic_, & logic similar to that of _SearchBar_, to highlight GenAI bot|
|     |   Edit: In _الرئيسية_ p., in _SearchBarRow_ _SearchIcon_ logic, removed _Internal Knowledge Graph Entity Bot_ option|
|     |   Edit: In _الرئيسية_ p., in _SearchBarRow_ _SearchIcon_ logic, changed icons of: _Internal Custom_, _External Knowledge Graph Entity_ Searches to _binoculars_, _external-link_ from _sign-in_, _sign-out_|
|     |   Edit: In _الرئيسية_ p., in _SearchBarRow_ _SearchBar_ logic, added setting _SearchSource_ page variable to 0 (as _SearchIcon_ counter now stops at 1!)|
|     |   Edit: In _الرئيسية_ p., in _SearchBarRow_ _SearchBar_ logic, changed icons of: _Internal Custom_, _External Knowledge Graph Entity_, _Internal Knowledge Graph Entity Bot_ Searches to _binoculars_, _external-link_, _magic_ from _sign-in_, _sign-out_, _reddit-alien_|
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
|     Runtime Version | 4.11.163|
|     Released OS | **Android** - Google (aab)|
|     Released Build# | 36573|
|     Released Date | 31/08/2024|
|     Notes |   SAP Build Apps builds require Android SDK published on non-SAP site to be version 34 or higher. This change sets the minimum supported device version to Android 14.|
|     Changes |   ***(as Version Code: 20240607)***|

| Header | Details |
|-----:|-----------|
|     Creation Date/Time | 07/06/2024  03:58|
|     Version | 0.10.3|
|     Version Code | 20240607|
|     Runtime Version | 4.11.114|
|     Released OS | **Web** – **Android** - Google (aab) – **Android** - Huawei (aab) – **Android** - Amazon (aab) – **Windows** - Amazon (aab) – **Android** - APKPure (_apk_) – **iOS** (ipa)|
|     Released Build# | 28606 – 28607 – 28607 – 28607 – 28607 – _28607_ – 28608|
|     Released Date | 07/06/2024|
|     Notes |   To date, SAP Build Apps (AppGyver) builds require Android SDK to be version 26 (Released in 2017). This change depreciates support for Android 6 & 7 devices and sets the minimum version to Android 8 Oreo.|
|     Changes |   Edit:  In _الرئيسية_ p., in _SearchBarRow_ _SearchIcon_ logic, setting _StarRating_ values according to _SearchSource_ plus 1|
|     |   Edit:  In _الرئيسية_ p., in _SearchBarRow_ _StarRating_ logic, added _Tap component_ logic to programmatically tap _SearchIcon_ component ***(unfunctional)***|
|     |   Add: _i360g_ data resource linked to _Vectara.com_, to add GenAI with required dynamic Request body _text_ in _Create Record (Post)_; and changing _Record Properties_ (a.k.a. body) binding type to _Formula_ (instead of default: _Object with properties_) then setting it to: `{query: [{"query":"الأشعرية","queryContext":"","start":0,"numResults":25,"contextConfig":{"charsBefore":0,"charsAfter":0,"sentencesBefore":2,"sentencesAfter":2,"startTag":"%START_SNIPPET%","endTag":"%END_SNIPPET%"},"rerankingConfig":{"rerankerId":272725718,"mmrConfig":{"diversityBias":0}},"corpusKey":[{"customerId":757392150,"corpusId":2,"semantics":0,"metadataFilter":"","lexicalInterpolationConfig":{"lambda":0.025},"dim":[]}],"summary":[{"debug":false,"chat":{"store":true,"conversationId":""},"maxSummarizedResults":5,"responseLang":"ara","summarizerPromptName":"vectara-summary-ext-v1.2.0","factualConsistencyScore":true}]}]}` ***(functional; unused)***; created: 04/06/2024|
|     |   Edit: set _BotSearch_ field to _BotSonic.com_ (based on model: _ChatGPT_); set: 05/06/2024|
|     |   Edit: disabled _Navigation header bar_ as page name was now forcibly displayed even on primary root page|
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
|     Runtime Version | 4.9.201|
|     Released OS | **Web** – **Android** - Google (aab) – **Android** - Huawei (aab) – **Android** - Amazon (aab) – **Windows** - Amazon (aab) – **Android** - APKPure (_apk_) – **iOS** (ipa)|
|     Released Build# | 21847 – 21836 – 21836 – 21836 – 21836 – _21836_ – 25776|
|     Released Date | 24/03/2024|
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
|     Runtime Version | 4.9.110|
|     Released OS | **Web** – **Android** - Google (aab) – **Android** - Huawei (aab) – **Android** - Amazon (aab) – **Windows** - Amazon (aab) – **Android** - APKPure (_apk_) – **iOS** (ipa)|
|     Released Build# | 304998 – 304999 – 304999 – 304999 – 304999 – _304999_ – 305000|
|     Released Date | 10/11/2023|
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
|     Runtime Version | 4.9.72|
|     Released OS | **Web** – **Android** - Google (aab) – **Android** - Huawei (aab) – **Android** - Amazon (aab) – **Windows** - Amazon (aab) – **Android** - APKPure (_apk_) – **iOS** (ipa)|
|     Released Build# | 303425 – 303426 – 303426 – 303426 – 303426 – _303426_ – 303427|
|     Released Date | 22/10/2023|
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
|     Runtime Version | 4.9.72|
|     Released OS | **Web** – **Android** - Google (aab) – **Android** - Huawei (aab) – **Android** - Amazon (aab) – **Windows** - Amazon (aab) – **Android** - UpToDown (apk) – **Android** - APKPure (apk) – **iOS** (ipa)|
|     Released Build# | 298282 – 298283 – 298283 – 298283 – 298283 – 298486 – 298486 – 298325|
|     Released Date | 14/09/2023|
|     Notes |   **testo**|
|     |   Changed app file download link on _WordPress.com_ from _Box.com_ to _APKPure.com_ for smaller downloads on 20/09/2023|
|     Changes |   Add: In _الرئيسية_ p., _SelectWeb_ page variable|
|     |   Edit:  In _الرئيسية_ p., added _SelectWeb_ in _SciencesList_ logic setting as selected row's _Web_ field|
|     |   Edit:  In _الرئيسية_ p., _Osfn_ flow function, added condition to WebView use, namely: checking if webpage is non-secure (i.e. uses _http_ instead of _https_) & checking several websites list (e.g. _facebook.com_) that require opening another tap to authenticate login then continues business-as-usual, to open in external browser as both cases of which fail in WebView (by design!)|
  
</details>

<details>
<summary>v 0.9.13 (updated-sequel)</summary>

| Header | Details |
|-----:|-----------|
|     Creation Date/Time | 03/09/2023  22:34|
|     Version | 0.9.13|
|     Version Code | 20230905|
|     Runtime Version | 4.9.72|
|     Released OS | **Web** – **Android** - Google (aab) – **Android** - Huawei (aab) – **Android** - Amazon (aab) – **Windows** - Amazon (aab) – **iOS** (ipa)|
|     Released Build# | 297142 – 297143 – 297143 – 297143 – 297143 – 297144|
|     Released Date | 03/09/2023|
|     Notes | _|
|     Changes |   Fix: In _الرئيسية_ p., changed _id_ in _SciencesList_ component & logic (as _id_ in _Baserow.io_ is only an integer causing an app glitch of sorts)|
  
</details>

<details>
<summary>v 0.9.13 (updated)</summary>

| Header | Details |
|-----:|-----------|
|     Creation Date/Time | 03/09/2023  12:19|
|     Version | 0.9.13|
|     Version Code | 20230904|
|     Runtime Version | 4.9.72|
|     Released OS | **Web** – **Android** - Google (aab) – **Android** - Huawei (aab) – **Android** - Amazon (aab) – **Windows** - Amazon (aab) – **iOS** (ipa)|
|     Released Build# | 297118 – 297119 – 297119 – 297119 – 297119 – 297120|
|     Released Date | 03/09/2023|
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
|     Runtime Version | 4.9.72|
|     Released OS | **Web** – **Android** - Google (aab) – **Android** - Huawei (aab) – **Android** - Amazon (aab) – **Windows** - Amazon (aab) – **iOS** (ipa)|
|     Released Build# | 297097 – 297098 – 297098 – 297098 – 297098 – 297099|
|     Released Date | 03/09/2023|
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
|     Runtime Version | 4.9.72|
|     Released OS | **Web** – **Android** - Google (aab) – **Android** - Huawei (aab) – **Android** - Amazon (aab) – **Windows** - Amazon (aab) – **iOS** (ipa)|
|     Released Build# | 295784 – 295927 – 295927 – 295927 – 295927 – 295786|
|     Released Date | 23/08/2023|
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
|     Runtime Version | 4.9.72|
|     Released OS | **Web** – **Android** - Google (aab) – **Android** - Huawei (aab) – **Android** - Amazon (aab) – **Windows** - Amazon (aab) – **iOS** (ipa)|
|     Released Build# | 295669 – 295670 – 295670 – 295670 – 295670 – 295671|
|     Released Date | 23/08/2023|
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
|     Runtime Version | 4.9.72|
|     Released OS | **Web** – **Android** - Google (aab) – **Android** - Huawei (aab) – **Android** - Amazon (aab) – **Windows** - Amazon (aab) – **iOS** (ipa)|
|     Released Build# | 294743 – 294700 – 294700 – 294700 – 294700 – 294707|
|     Released Date | 15/08/2023|
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
|     Runtime Version | 4.9.72|
|     Released OS | **Web** – **Android** - Google (aab) – **Android** - Huawei (aab) – **Android** - Amazon (aab) – **Windows** - Amazon (aab) – **iOS** (ipa)|
|     Released Build# | 294344 – 294332 – 294332 – 294332 – 294332 – 294334|
|     Released Date | 10/08/2023|
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
|     Runtime Version | 4.9.72|
|     Released OS | **Web** – **Android** - Google (aab) – **Android** - Huawei (aab) – **Android** - Amazon (aab) – **Windows** - Amazon (aab) – **iOS** (ipa)|
|     Released Build# | 292251 – 292337 – 292332 – 292332 – 292332 – 292498|
|     Released Date | 26/07/2023|
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
|     Runtime Version | 4.7.37|
|     Released OS | **Web** – **Android** - Google (aab) – **Android** - Huawei (aab) – **Android** - Amazon (aab) – **Windows** - Amazon (aab) – **iOS** (ipa)|
|     Released Build# | 284795 – 284796 – 284796 – 284796 – 284796 – 284798|
|     Released Date | 07/06/2023|
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
|     Runtime Version | 4.7.37|
|     Released OS | **Web** – **Android** - Google (aab) – **Android** - Huawei (aab) – **Android** - Amazon (aab) – **Windows** - Amazon (aab) – **iOS** (ipa)|
|     Released Build# | 283398 – 283399 – 283399 – 283399 – 283399 – 283769|
|     Released Date | 27/05/2023|
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
|     Runtime Version | 4.7.37|
|     Released OS | **Web** – **Android** - Google (aab) – **Android** - Huawei (aab) – **Android** - Amazon (aab) – **Windows** - Amazon (aab) – **iOS** (ipa)|
|     Released Build# | 281499 – 281500 – 281500 – 281500 – 281500 – 281502|
|     Released Date | 12/05/2023|
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
|     Runtime Version | 4.7.37|
|     Released OS | **Web** – **Android** - Google (aab) – **Android** - Huawei (aab) – **Android** - Amazon (aab) – **Windows** - Amazon (aab) – **iOS** (ipa)|
|     Released Build# | 280703 – 280704 – 280704 – 280704 – 280704 – 280706|
|     Released Date | 07/05/2023|
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
|     Runtime Version | 4.7.37|
|     Released OS | **Web** – **Android** - Google (aab) – **Android** - Huawei (aab) – **Android** - Amazon (aab) – **Windows** - Amazon (aab) – **iOS** (ipa)|
|     Released Build# | 279389 – 279390 – 279390 – 279390 – 279390 – 279392|
|     Released Date | 27/04/2023|
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
|     Runtime Version | 4.7.36|
|     Released OS | **Web** – **Android** - Google (aab) – **Android** - Huawei (aab) – **Android** - Amazon (aab) – **iOS** (ipa)|
|     Released Build# | 278064 – 278065 – 278065 – 278065 – 278067|
|     Released Date | 17/04/2023|
|     Notes | _|
|     Changes | Add: _i360t_ data resource linked to _Azure Translator_, to enable Translation of Entity search term with required dynamic Request body _text_ in _Create Record (Post)_, created: 15/04/2023 ***(unfunctional***_; Error: JSON error response from server: {"error":{"code":400074,"message":"The body of the request is not valid JSON."}}.status: 400_***)***|
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
|     Runtime Version | 4.7.36|
|     Released OS | **Web** – **Android** - Google (aab) – **Android** - Huawei (aab) – **Android** - Amazon (aab) – **iOS** (ipa)|
|     Released Build# | 277738 – 277739 – 277739 – 277739 – 277750|
|     Released Date | 14/04/2023|
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
|     Runtime Version | 4.7.36|
|     Released OS | **Web** – **Android** - Google (aab) – **Android** - Huawei (aab) – **Android** - Amazon (aab) – **iOS** (ipa)|
|     Released Build# | 275037 – 275026 – 275026 – 275026 – 275028|
|     Released Date | 23/03/2023|
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
|     Runtime Version | 4.6.36|
|     Released OS | **Web** – **Android** - Google (aab) – **Android** - Huawei (aab) – **Android** - Amazon (aab) – **iOS** (ipa)|
|     Released Build# | 273739 – 273740 – 273740 – 273740 – 273742|
|     Released Date | 16/03/2023|
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
