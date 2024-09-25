# i360
إi360 تطبيق إسلامي موسوعي للعلوم الإسلامية الأساسية بشكل متكامل مختصر بسيط

<details>
<summary>v 0.8.3 (MS4)</summary>

| Header | Details |
|-----:|-----------|
|     Creation Date/Time | 10/09/2022 14:32|
|     Version | 0.8.3|
|     Version Code | 20220910|
|     AppGyver Runtime Version | 4.6.11|
|     Released OS | **Web** – **Android** - Google (aab) – **Android** - Huawei (apk) – **Android** - Amazon (aab) – **iOS** (ipa)|
|     Released Build# | 243130 – 243131 – 243132 – 243131 – 243133|
|     Released | 10/09/2022|
|     Notes | **i360إ-MS4 (MS=MileStone)**|
|     Changes | Fix: Set _InputToolsText_ with same logic & visibility|
|     | Edit: To fix issue displaying Web content on non-Android/iOS using WebView|
|     |   - Added a 5<sup>th</sup> output node to _Osfn_ flow function based on _useWeb_ (manually chosen) or non-Android/iOS detected thus switching to using normal web browser|
|     |   - In _الرئيسية_ p. mount, set default value of _useWeb_ to be true for Anroid/iOS & false otherwise|
|     | Add: Spinned-off this version to another app.: ***i360إ-MS4*** (MS=MileStone)|
  
</details>

<details>
<summary>v 0.8.2</summary>

| Header | Details |
|-----:|-----------|
|     Creation Date/Time | 08/09/2022 14:00|
|     Version | 0.8.2|
|     Version Code | 20220908|
|     AppGyver Runtime Version | 4.6.11|
|     Released OS | **Web** – **Android** - Google (aab) – **Android** - Huawei (apk) – **iOS** (ipa)|
|     Released Build# | 242758 – 242759 – 242760 – 242761|
|     Released | 08/09/2022|
|     Notes | _|
|     Changes | Edit: Moved _HedayahLearning_ image, _IslamicThoughtComponentBooks_ button to _SciencesList_|
|     | Edit: Moved _InputTools_ icon, _Notes_ text to _AppSupportRow_|
|     | Add: _InputToolsText_ below _InputTools_ icon|
|     | Del: _NotesRow_|
|     | Edit: Enahanced app. ornaments by adding ornamented cells at the edges & including adding ornamented _HeaderRow_, _FooterRow_ rows|
|     | Edit: Reduced sizes of _Support_, _PrivacyPolicy_ icons from _Title XL_ to _Title L_ (as _AppIcon_)|
|     | Edit: Increased size of _InputTools_ icon from _Text XXL_ to _Title L_ (as _AppIcon_)|
  
</details>

<details>
<summary>v 0.8.1</summary>

| Header | Details |
|-----:|-----------|
|     Creation Date/Time | 06/09/2022 19:30|
|     Version | 0.8.1|
|     Version Code | 20220906|
|     AppGyver Runtime Version | 4.5.10|
|     Released OS | **Web** – **Android** - Google (aab) – **Android** - Huawei (apk) – **iOS** (ipa)|
|     Released Build# | 242500 – 242483 – 242416 – 242420|
|     Released | 06/09/2022|
|     Notes | Excluded in Apple AppStore: China; for _content licensing_|
|     Changes | Del: _compass_ icon to del. _Start compass poller_ that required _Location_ permission!|
  
</details>

<details>
<summary>v 0.8.0</summary>

| Header | Details |
|-----:|-----------|
|     Creation Date/Time | 05/09/2022 20:23|
|     Version | 0.8.0|
|     Version Code | 20220905|
|     AppGyver Runtime Version | 4.5.10|
|     Released OS | **Web** – **Android** - Google (aab) – **Android** - Huawei (apk) – **iOS** (ipa)|
|     Released Build# | 242235 – 242237 – 242238 – 242239|
|     Released | 05/09/2022|
|     Notes | _|
|     Changes | Edit: Renamed _ScienceCollapsibleGroupedIconList_ Collapsible grouped icon list to _SciencesList_|
|     | Edit: Renamed _Main_ p. to _الرئيسية_|
|     | Add: _المتصفح_ p. including _WebView_; i.e. Changed _Open URL_ component to _Open web browser_ (a.k.a. _WebView_) for files/websites but not apps, effectively creating an app. built-in browser; expanding its height to 640 px to fit more content within _many_ mobile screens (too long will hide part of the displayed webpage)|
|     | Add: In  _المتصفح_ p., _WebParam_ p. parameter|
|     | Edit: In _الرئيسية_ p. mount, added setting _useWeb_ app. variable to true (so app.'s default is _web_ then local OS)|
|     | Edit: In _SciencesList_ list, changed _OSfn_ Web node from _Open URL_ to _Open Page_, namely _المتصفح_ p.|
|     | Add: _compass_ icon as visible indicator for existing device compass using _Start compass poller_|

</details>

<details>
<summary>v 0.7.0 (NG1)</summary>

| Header | Details |
|-----:|-----------|
|     Creation Date/Time | 29/08/2022 20:23|
|     Version | 0.7.0|
|     Version Code | 20220829|
|     AppGyver Runtime Version | 4.5.10|
|     Released OS | **Web** – **Android** - Google (aab) – **Android** - Huawei (aab) – **iOS** (ipa)|
|     Released Build# | 240722 – 240723 – 240723 – 241052|
|     Released | 06/09/2022|
|     Notes | **i360إ-NG1 (NG=Next Generation)**|
|     | Excluded in Huawei AppGallery: China, India; for _privacy policy notification_|
|     Changes | Edit: Decreased vertical gaps between all rows/buttons on all pages by half: from 16px to 8px|
|     | Edit: Rearranged _QuranReading_ in about page to be consistent with the rest of the info.|
|     | Edit: Renamed _i360privacy_ item to _i360Privacy_|
|     | Edit: Renamed _Azkar_ button to _Prayers_|
|     | Add:  Imported _i360db.xlsx_, _Sciences_ tab, to Airtable base (online database)|
|     | Add: _i360db_ data resource linked to _i360db.xlsx - Sciences_ Airtable using REST API with API key (set as read-only by using composite share: primary user has full-access & secondary user based on first with read-only (as suggested by Airtable)!; NB - after 'getting collection', 'testing' & 'setting schema from response', change _IconName_ field type from 'text' to 'icon name' for compatibility use|
|     | Add: _i360Records_ data variable, type: 'Collection of data records', based on _i360db_ data resource|
|     | Add: _ScienceCollapsibleGroupedIconList_ replacing all buttons/icons using _OSfn_ flow function; NB - items were manually ordered as desired visually!|
|     | Edit: Moved _HedayahLearning_ image, _IslamicThoughtComponentBooks_ button, _Support_ & _PrivacyPolicy_ icons from _About_ to _Main_ p.|
|     | Edit: Changed _Notes_ text to include app. ver. & release date|
|     | Del: _About_ p., including _AppStoresRow_!|
|     | Del: _QuranRecitation_, _defaultOS_, _iconOS_, _showStores_, _usedOS_ app variables|
|     | Del: _QuranicResearcher_ & _HadithResearcher_ icons|
  
</details>
