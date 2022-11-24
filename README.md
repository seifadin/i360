# i360
إi360 تطبيق إسلامي موسوعي للعلوم الإسلامية الأساسية بشكل متكامل مختصر بسيط

Creation DateTime	29/08/2022 20:23
Version	0.7.0
Version Code	20220829
AppGyver Runtime Version	4.5.10
Released OS	Web
Released Build#	240722
Released	29/08/2022
Notes	Excluded in Huawei AppGallery: China, India; for "privacy policy notification"
Changes	"Edit: Decreased vertical gaps between all rows/buttons on all pages by half: from 16px to 8px
Edit: Rearranged ""QuranReading"" in about page to be consistent with the rest of the info.
Edit: Renamed ""i360privacy"" item to ""i360Privacy""
Edit: Renamed ""Azkar"" button to ""Prayers""
Add: Imported ""i360db.xlsx"" to Airtable base (online database)
Add: ""i360db"" data resource linked to ""i360db.xlsx"" Airtable using REST API; NB - after 'getting collection', 'testing' & 'setting schema from response', change ""IconName"" field type from 'text' to 'icon name' for compatibility use
Add: ""i360Records"" data variable, type: 'collection of data records', based on ""i360db"" data resource
Add: ""ScienceCollapsibleGroupedIconList"" replacing all buttons/icons using ""OSfn"" flow function; NB - items were manually ordered as desired visually!
Edit: Moved ""HedayahLearning"" image, ""IslamicThoughtComponentBooks"" button, ""Support"" & ""PrivacyPolicy"" icons from ""About"" to ""Main"" p.
Edit: Changed ""Notes"" text to include app. ver. & release date
Del: ""About"" p., including ""AppStoresRow""!
Del: ""QuranRecitation"", ""defaultOS"", ""iconOS"", ""showStores"", ""usedOS"" app variables
Del: ""QuranicResearcher"" & ""HadithResearcher"" icons"
___
Creation DateTime	05/09/2022 20:23
Version	0.8.0
Version Code	20220905
AppGyver Runtime Version	4.5.10
Released OS	Web
Released Build#	242235
Released	_
Notes	_
Changes	"Edit: Renamed ""ScienceCollapsibleGroupedIconList"" Collapsible grouped icon list to ""SciencesList""
Edit: Renamed ""Main"" p. to ""الرئيسية""
Add: ""المتصفح"" p. including ""WebView""; i.e. Changed ""Open URL"" component to ""Open web browser"" (a.k.a. ""WebView"") for files/websites but not apps, effectively creating an app. built-in browser; expanding its height to 640 px to fit more content within ""many"" mobile screens (too long will hide part of the displayed webpage)
Add: In  ""المتصفح"" p., ""WebParam"" p. parameter
Edit: In ""الرئيسية"" p. mount, added setting ""useWeb"" app. var. to true (so app.'s default is ""web"" then local OS)
Edit: In ""SciencesList"" list, changed ""OSfn"" Web node from ""Open URL"" to ""Open Page"", namely ""المتصفح"" p.
Add: ""compass"" icon as visible indicator for existing device compass using ""Start compass poller"""
___
Creation DateTime	06/09/2022 19:30
Version	0.8.1
Version Code	20220906
AppGyver Runtime Version	4.5.10
Released OS	Web
Released Build#	242500
Released	06/09/2022
Notes	Excluded in Apple AppStore: China; for "content licensing"
Changes	Del: "compass" icon to del. "Start compass poller" that requried "Location" permission!
___
Creation DateTime	08/09/2022 14:00
Version	0.8.2
Version Code	20220908
AppGyver Runtime Version	4.6.11
Released OS	Web
Released Build#	242758
Released	08/09/2022
Notes	_
Changes	"Edit: Moved ""HedayahLearning"" image, ""IslamicThoughtComponentBooks"" button to ""SciencesList""
Edit: Moved ""InputTools"" icon, ""Notes"" text to ""AppSupportRow""
Add: ""InputToolsText"" below ""InputTools"" icon
Del: ""NotesRow""
Edit: Enahanced app. ornaments by adding ornamented cells at the edges & including adding ornamented ""HeaderRow"", ""FooterRow"" rows
Edit: Reduced sizes of ""Support"", ""PrivacyPolicy"" icons from ""Title XL"" to ""Title L"" (as ""AppIcon"")
Edit: Increased size of ""InputTools"" icon from ""Text XXL"" to ""Title L"" (as ""AppIcon"")"
___
Creation DateTime	10/09/2022 14:32
Version	0.8.3
Version Code	20220910
AppGyver Runtime Version	4.6.11
Released OS	Web
Released Build#	243130
Released	10/09/2022
Notes	Excluded in Amzon AppStore: for "crashing!"
Changes	"Fix: Set ""InputToolsText"" with same logic & visibility
Edit: To fix issue displaying Web content on non-Android/iOS using WebView
  - Added a 5th output node to ""Osfn"" flow function based on ""useWeb"" (manually chosen) or non-Android/iOS detected thus switching to using normal web browser
  -  In ""الرئيسية"" p. mount, set default value of ""useWeb"" to be true for Anroid/iOS & false otherwise"
___
