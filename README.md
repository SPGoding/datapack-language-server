![banner](https://raw.githubusercontent.com/SPGoding/datapack-language-server/master/img/banner.png)

[![CircleCI](https://img.shields.io/circleci/build/github/SPGoding/datapack-language-server.svg?logo=circleci&style=flat-square)](https://circleci.com/gh/SPGoding/datapack-language-server)
[![npm](https://img.shields.io/npm/v/datapack-language-server.svg?logo=npm&style=flat-square)](https://npmjs.com/package/datapack-language-server)
[![VSCode Marketplace](https://img.shields.io/visual-studio-marketplace/v/SPGoding.datapack-language-server.svg?logo=visual-studio-code&style=flat-square)](https://marketplace.visualstudio.com/items?itemName=SPGoding.datapack-language-server)
[![VSCode Marketplace Downloads](https://img.shields.io/visual-studio-marketplace/d/SPGoding.datapack-language-server.svg?logo=visual-studio-code&style=flat-square)](https://marketplace.visualstudio.com/items?itemName=SPGoding.datapack-language-server)
[![VSCode Marketplace Installs](https://img.shields.io/visual-studio-marketplace/i/SPGoding.datapack-language-server.svg?logo=visual-studio-code&style=flat-square)](https://marketplace.visualstudio.com/items?itemName=SPGoding.datapack-language-server)
[![VSCode Marketplace Rating](https://img.shields.io/visual-studio-marketplace/stars/SPGoding.datapack-language-server.svg?logo=visual-studio-code&style=flat-square)](https://marketplace.visualstudio.com/items?itemName=SPGoding.datapack-language-server)
[![Codecov](https://img.shields.io/codecov/c/gh/SPGoding/datapack-language-server.svg?logo=codecov&style=flat-square)](https://codecov.io/gh/SPGoding/datapack-language-server)
[![License](https://img.shields.io/github/license/SPGoding/datapack-language-server.svg?style=flat-square)](https://github.com/SPGoding/datapack-language-server/blob/master/LICENSE)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg?style=flat-square)](https://github.com/semantic-release/semantic-release)
[![Gitmoji](https://img.shields.io/badge/gitmoji-%20😜%20😍-FFDD67.svg?style=flat-square)](https://gitmoji.carloscuesta.me/)

A really heavy language server providing completions, signatures, renaming, definitions, references, diagnostics, folding ranges, color information, hover information and document links for data packs in JE 1.15. THIS IS STILL WIP SO MANY FEATURES DO NOT WORK.

# Note

0. DHP uses cache to speed up renaming, finding definitions/references. The cache will be stored in `.datapack/cache.json` in your workspace. You should never edit the cache file manually. It shoud be added in `.gitignore` if you are using Git as your preferred version control tool.
1. Please use the root directory of your data pack as the workspace. Otherwise you can't use all features depending on the cache file. 

# Features

## Semantic Highlighting

Nope. I follow the spirit of [no code](https://github.com/kelseyhightower/nocode) project so I wrote no code about semantic coloring. There won't be any issues about it, yah!

Just joking. Semantic highlighting will be implemented whenever https://github.com/microsoft/vscode-languageserver-node/pull/367 is resolved. Before that, I recommend to use [Arcensoth](https://github.com/Arcensoth)'s [language-mcfunction](https://marketplace.visualstudio.com/items?itemName=arcensoth.language-mcfunction) extension. All the screenshots below are taken with both mine and Arcensoth's extension enabled.

## Signature Information

You can get hints about the arguments of commands while typing.

![signature-help](https://raw.githubusercontent.com/SPGoding/datapack-language-server/master/img/signature-help.gif)

## Completions

The extension can compute completions as you typing commands. Completions will automatically show if you commit one of these characters: `[' ', ',', '{', '[', '=', ':', '/', '!', "'", '"', '.']`. Alternatively you can use Ctrl + Space (or other configured hotkey) to show completions manually. Note: completions are not available everywhere. Typically only the beginnings of arguments and literals are supported.

DHP can provide completions for simple commands:
![simple-completions](https://raw.githubusercontent.com/SPGoding/datapack-language-server/master/img/simple-completions.gif)

For more complex NBT tags:
![nbt-tag-completions](https://raw.githubusercontent.com/SPGoding/datapack-language-server/master/img/nbt-tag-completions.gif)

And also NBT paths:
![nbt-path-completions](https://raw.githubusercontent.com/SPGoding/datapack-language-server/master/img/nbt-path-completions.gif)

FOR NBTS IN COMMANDS IN JSON TEXT COMPONENTS IN ITEM TAG NBTS, HANDLING THE ANOYYING ESCAPE AUTOMATICALLY FOR YOU:
![ohhhh-completions](https://raw.githubusercontent.com/SPGoding/datapack-language-server/master/img/ohhhh-completions.gif)

## Definition Comments

You can use `#define (entity|storage|tag) <id: string> [description: string]` to define an entity, a data storage or a scoreboard tag. Definition comments will be used to compute completions, rename symbols and find references/definitions. The game will treat definition comments as normal comments and simply ignore them.

![definition-comments](https://raw.githubusercontent.com/SPGoding/datapack-language-server/master/img/definition-comments.png)

## Diagnostics

DHP provides real-time diagnostics about your commands. It can show syntax errors as Minecraft does, and even give your more detailed warnings.

![diagnostics](https://raw.githubusercontent.com/SPGoding/datapack-language-server/master/img/diagnostics.gif)

## Folding Ranges

You can use comments to create folding ranges, which makes the structure of mcfunction file much clearer. 

```mcfunction
#region This is a block of commands
execute if score @s test matches 1 run say 1
execute if score @s test matches 2 run say 2
execute if score @s test matches 3 run say 3
execute if score @s test matches 4 run say 4
execute if score @s test matches 5 run say 5
#endregion
```

![folding-region](https://raw.githubusercontent.com/SPGoding/datapack-language-server/master/img/folding-region.gif)

## Color Information

DHP will display colors for `dust` particles. You can change the color by hovering your cursor on it.

![color-particle](https://raw.githubusercontent.com/SPGoding/datapack-language-server/master/img/color-particle.gif)

## Hover Information

This is WIP.

DHP shows user-defined documentation when you hover on specific arguments, e.g. on function namespaced IDs, tags, teams, etc.

<!-- ![hover-on-function]() -->

## Resolving Namespaced IDs

You can navigate to advancements, loot tables, functions, predicates and all kinds of tags by Ctrl-clicking on their namespaced IDs.

![document-link](https://raw.githubusercontent.com/SPGoding/datapack-language-server/master/img/document-link.gif)

## Goto Definitions

You can goto the definitions of entities, tags, teams, bossbars and data storages in the workspace by Ctrl-clicking on their names.

![goto-definition](https://raw.githubusercontent.com/SPGoding/datapack-language-server/master/img/goto-definition.gif)

## Finding References

You can find all the references of entities, tags, teams, bossbars and data storages in the workspace by pressing Shift + F12 or other configured key.

![peek-references](https://raw.githubusercontent.com/SPGoding/datapack-language-server/master/img/peek-references.gif)

## Renaming

You can rename entities, tags, teams, bossbars, data storages, advancements, functions, loot tables, predicates, recipes and all kinds of tags by pressing F2 or other configured key on their names.

All the references of the same symbol in the whole workspace will be renamed.

**WARNING**: your input can be accidentally corrupted by using this feature. Use it at your own risk.

![rename-objective](https://raw.githubusercontent.com/SPGoding/datapack-language-server/master/img/rename-objective.gif)

Additionally, if you rename a namespaced ID with file definition (e.g. the ID for advancement, function, loot table, predicate, recipe or tag), the corresponding file in the workspace will be renamed/moved too.

![rename-function](https://raw.githubusercontent.com/SPGoding/datapack-language-server/master/img/rename-function.gif)

*However*, renaming a file in a workspace manually will *not* update the namespaced IDs of it, and may cause problems with the cache.

## Formatting and Linting

This is WIP.

Your command will be formatted after you commit `\n` character. Alternatively, you can trigger it manually by pressing Alt + Shift + F or other configured hotkey.

There are several linting rules you can set in the configuration file.

**WARNING**: your input can be accidentally lost by using this feature. Use it at your own risk. This feature is disabled by default.

### blockStateAppendSpaceAfterComma: `boolean`

Whether to append spaces after commas in block states or not.  
@default `false`

### blockStatePutSpacesAroundEqualSign: `boolean`

Whether to put spaces around equal signs in block states or not.  
@default `false`

### blockStateSortKeys: `boolean`

Whether to sort the keys in block states or not.  
@default `false`

### entitySelectorAppendSpaceAfterComma: `boolean`

Whether to append spaces after commas in entity selectors or not.  
@default `false`

### entitySelectorPutSpacesAroundEqualSign: `boolean`

Whether to put spaces around equal signs in entity selectors or not.  
@default `false`

### entitySelectorKeyOrder: `(keyof SelectorParsedArgument)[]`

In which order the arguments in entity selectors should be. The default order is based on the research
by vdvman1 at https://minecraftcommands.github.io/commanders-handbook/selector-argument-order.  
@default
```json
[
    "sort",
    "limit",
    "type",
    "gamemode",
    "gamemodeNeg",
    "level",
    "team",
    "teamNeg",
    "typeNeg",
    "tag",
    "tagNeg",
    "name",
    "nameNeg",
    "predicate",
    "predicateNeg",
    "scores",
    "advancements",
    "nbt",
    "nbtNeg",
    "x",
    "y",
    "z",
    "dx",
    "dy",
    "dz",
    "distance",
    "x_rotation",
    "y_rotation"
]
```

### quoteType: `'always single' | 'always double' | 'prefer single' | 'prefer double'`

Quotes used in NBT strings and phrase strings.  
`'always single'`: Always use single quotes.  
`'always double'`: Always use double quotes.  
`'prefer single'`: Always use single quotes, unless there are single quotes in the string.  
`'prefer double'`: Always use double quotes, unless there are double quotes in the string.  
@default `'prefer double'`  

### quoteEntitySelectorKeys: `boolean`

When the keys in entity selectors should be quoted.  
`true`: Always.  
`false`: Never.  
@default `false`

### quoteSnbtStringKeys: `boolean`

When the string keys in SNBTs should be quoted.  
`true`: Always.  
`false`: Only when there are special characters in the string.  
@default `false`

### quoteNbtStringValues: `boolean`

When the string values in SNBTs should be quoted.  
`true`: Always.  
`false`: Only when there are special characters in the string.  
@default `true`

### snbtAppendSpaceAfterColon: `boolean`

Whether to append spaces after colons in SNBTs or not.  
@default `true`

### snbtAppendSpaceAfterComma: `boolean`

Whether to append spaces after commas in SNBT or not.  
@default `true`

### snbtAppendSpaceAfterSemicolon: `boolean`

Whether to append spaces after semicolons in SNBTs or not.  
@default `true`

### snbtByteSuffix: `'b' | 'B'`

The suffix used for TAG_Byte in SNBTs.  
@default `'b'`

### snbtUseBooleans: `boolean`

Whether `0b` and `1b` should be represents by `false` and `true` in SNBTs or not.  
@default `false`

### snbtShortSuffix: `'s' | 'S'`

The suffix used for TAG_Short in SNBTs.  
@default `'s'`

### snbtLongSuffix: `'l' | 'L'`

The suffix used for TAG_Long in SNBTs.  
@default `'L'`

### snbtFloatSuffix: `'f' | 'F'`

The suffix used for TAG_Float in SNBTs.  
@default `'f'`

### snbtDoubleSuffix: `'d' | 'D'`

The suffix used for TAG_Double in SNBTs.  
@default `'d'`

### snbtOmitDoubleSuffix: `boolean`

Whether to omit the suffix of double numbers when possible in SNBTs or not.  
@default `false`

### snbtKeepDecimalPlace: `boolean`

Whether to keep at least one decimal place in SNBTs or not.  
@default `true`

### snbtSortKeys: `boolean`

Whether to sort keys in compound tags in SNBTs or not.  
@default `false`

### timeOmitTickUnit: boolean

Whether to omit the unit of tick (`t`) in time arguments.  
@default `false`

### nameOfObjectives: `NamingConventionConfig`

The naming convension for scoreboard objectives.  
@default `'whatever'`

### nameOfSnbtCompoundTagKeys: `NamingConventionConfig`

The naming convension for compound tag keys in SNBTs.  
@default `'whatever'`

### nameOfTags: `NamingConventionConfig`

The naming convension for scoreboard tags.  
@default `'whatever'`

### nameOfTeams: `NamingConventionConfig`

The naming convension for teams.  
@default `'whatever'`

### strictBossbarCheck: boolean

Whether to throw warnings for undefined bossbars.  
@default `false`

### strictStorageCheck: boolean

Whether to throw warnings for undefined data storages.  
@default `false`

### strictObjectiveCheck: boolean

Whether to throw warnings for undefined objectives.  
@default `false`

### strictTagCheck: boolean

Whether to throw warnings for undefined tags.  
@default `false`

### strictTeamCheck: boolean

Whether to throw warnings for undefined teams.  
@default `false`

### strictAdvancementCheck: boolean

Whether to throw warnings for advancements which don't exist in your workspace.  
@default `false`

### strictFunctionCheck: boolean

Whether to throw warnings for functions which don't exist in your workspace.  
@default `false`

### strictLootTableCheck: boolean

Whether to throw warnings for loot tables which don't exist in your workspace.  
@default `false`

### strictPredicateCheck: boolean

Whether to throw warnings for predicates which don't exist in your workspace.  
@default `false`

### strictRecipeCheck: boolean

Whether to throw warnings for recipes which don't exist in your workspace.  
@default `false`

### strictBlockTagCheck: boolean

Whether to throw warnings for block tags which don't exist in your workspace.  
@default `false`

### strictEntityTypeTagCheck: boolean

Whether to throw warnings for entity type tags which don't exist in your workspace.  
@default `false`

### strictFluidTagCheck: boolean

Whether to throw warnings for fluid tags which don't exist in your workspace.  
@default `false`

### strictFunctionTagCheck: boolean

Whether to throw warnings for function tags which don't exist in your workspace.  
@default `false`

### strictItemTagCheck: boolean

Whether to throw warnings for item tags which don't exist in your workspace.  
@default `false`

### omitDefaultNamespace: boolean

Whether to omit default namespace (`minecraft`) in namespaced IDs.  
Does NOT affect namespaced IDs in NBT strings.  
@default `false`

<!-- ### vectorKeepDecimalPlace: boolean

Whether to keep at least one decimal place in vectors or not.  
If sets to `false`, the decimal place will still be kept to avoid center-correcting when necessary.  
@default `true` -->

# Contributors

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore -->
<table>
  <tr>
    <td align="center"><a href="https://github.com/SPGoding"><img src="https://avatars3.githubusercontent.com/u/15277496?v=4" width="100px;" alt="SPGoding"/><br /><sub><b>SPGoding</b></sub></a><br /><a href="https://github.com/SPGoding/datapack-language-server/commits?author=SPGoding" title="Code">💻</a> <a href="https://github.com/SPGoding/datapack-language-server/commits?author=SPGoding" title="Tests">⚠️</a> <a href="https://github.com/SPGoding/datapack-language-server/commits?author=SPGoding" title="Documentation">📖</a></td>
    <td align="center"><a href="https://github.com/switefaster"><img src="https://avatars2.githubusercontent.com/u/19944539?v=4" width="100px;" alt="switefaster"/><br /><sub><b>switefaster</b></sub></a><br /><a href="#financial-switefaster" title="Financial">💵</a></td>
    <td align="center"><a href="https://github.com/MarsCloud"><img src="https://avatars2.githubusercontent.com/u/43104628?v=4" width="100px;" alt="MarsCloud"/><br /><sub><b>MarsCloud</b></sub></a><br /><a href="#financial-MarsCloud" title="Financial">💵</a></td>
    <td align="center"><a href="https://github.com/PutEgg"><img src="https://avatars2.githubusercontent.com/u/15832518?v=4" width="100px;" alt="Heyu"/><br /><sub><b>Heyu</b></sub></a><br /><a href="#financial-PutEgg" title="Financial">💵</a></td>
    <td align="center"><a href="https://github.com/pca006132"><img src="https://avatars3.githubusercontent.com/u/12198657?v=4" width="100px;" alt="pca006132"/><br /><sub><b>pca006132</b></sub></a><br /><a href="#ideas-pca006132" title="Ideas, Planning, & Feedback">🤔</a></td>
    <td align="center"><a href="https://github.com/YijunYuan"><img src="https://avatars0.githubusercontent.com/u/7012463?v=4" width="100px;" alt="Yijun Yuan"/><br /><sub><b>Yijun Yuan</b></sub></a><br /><a href="https://github.com/SPGoding/datapack-language-server/issues?q=author%3AYijunYuan" title="Bug reports">🐛</a></td>
    <td align="center"><a href="https://github.com/MinecraftPeace"><img src="https://avatars2.githubusercontent.com/u/57551211?v=4" width="100px;" alt="MinecraftPeace"/><br /><sub><b>MinecraftPeace</b></sub></a><br /><a href="https://github.com/SPGoding/datapack-language-server/issues?q=author%3AMinecraftPeace" title="Bug reports">🐛</a></td>
  </tr>
  <tr>
    <td align="center"><a href="https://github.com/K-bai"><img src="https://avatars2.githubusercontent.com/u/31344344?v=4" width="100px;" alt="K-bai"/><br /><sub><b>K-bai</b></sub></a><br /><a href="https://github.com/SPGoding/datapack-language-server/issues?q=author%3AK-bai" title="Bug reports">🐛</a></td>
    <td align="center"><a href="https://github.com/ruhuasiyu"><img src="https://avatars2.githubusercontent.com/u/31852729?v=4" width="100px;" alt="ruhuasiyu"/><br /><sub><b>ruhuasiyu</b></sub></a><br /><a href="https://github.com/SPGoding/datapack-language-server/issues?q=author%3Aruhuasiyu" title="Bug reports">🐛</a></td>
    <td align="center"><a href="https://github.com/ChenCMD"><img src="https://avatars2.githubusercontent.com/u/46134240?v=4" width="100px;" alt="??"/><br /><sub><b>??</b></sub></a><br /><a href="https://github.com/SPGoding/datapack-language-server/issues?q=author%3AChenCMD" title="Bug reports">🐛</a></td>
    <td align="center"><a href="https://github.com/RicoloveFeng"><img src="https://avatars1.githubusercontent.com/u/44725122?v=4" width="100px;" alt="RicoloveFeng"/><br /><sub><b>RicoloveFeng</b></sub></a><br /><a href="#financial-RicoloveFeng" title="Financial">💵</a></td>
  </tr>
</table>

<!-- ALL-CONTRIBUTORS-LIST:END -->

And to those who haven't told me a GitHub account:

<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tr>
    <td align="center"><a href="https://www.mcbbs.net/home.php?mod=space&uid=67858"><img src="https://www.mcbbs.net/uc_server/avatar.php?uid=67858&size=middle" width="100px;" alt="夜之暗夜"/><br /><sub><b>夜之暗夜</b></sub></a><br /><a href="#design-夜之暗夜" title="Design">🎨</a></td>
    <td align="center"><a href="https://www.mcbbs.net/home.php?mod=space&uid=1073895"><img src="https://www.mcbbs.net/uc_server/avatar.php?uid=1073895&size=middle" width="100px;" alt="uuu2011"/><br /><sub><b>uuu2011</b></sub></a><br /><a href="#financial-uuu2011" title="Financial">💵</a></td>
    <td align="center"><a href="https://afdian.net/u/64da395e2b6811e99c7652540025c377"><img src="https://pic.afdiancdn.com/default/avatar/default-avatar@2x.png" width="100px;" alt="爱发电用户_4vCR"/><br /><sub><b>爱发电用户_4vCR</b></sub></a><br /><a href="#financial-爱发电用户_4vCR" title="Financial">💵</a></td>
    <td align="center"><a href="https://afdian.net/u/9c5521849fb011e99ecc52540025c377"><img src="https://pic.afdiancdn.com/user/9c5521849fb011e99ecc52540025c377/avatar/5d5ebfa0c83f7a50304bb472c9d320c1_w640_h640_s69.jpg" width="100px;" alt="夏白千层心"/><br /><sub><b>夏白千层心</b></sub></a><br /><a href="#financial-夏白千层心" title="Financial">💵</a></td>
    <td align="center"><a href="https://www.mcbbs.net/home.php?mod=space&uid=2176760"><img src="https://www.mcbbs.net/uc_server/avatar.php?uid=2176760&size=middle" width="100px;" alt="MCSugar_cane"/><br /><sub><b>MCSugar_cane</b></sub></a><br /><a href="#financial-MCSugar_cane" title="Financial">💵</a></td>
    <td align="center"><a href="https://afdian.net/@ChongXG"><img src="https://pic.afdiancdn.com/user/80487c58bfa911e8856452540025c377/avatar/c71ebb2c5c792b45d6f5b5bf087b0625_w1536_h1536_s1404.jpg" width="100px;" alt="虫小哥"/><br /><sub><b>虫小哥</b></sub></a><br /><a href="#financial-虫小哥" title="Financial">💵</a></td>
    <td align="center"><a href="https://afdian.net/@dhwpcs"><img src="https://pic.afdiancdn.com/user/470992469a5c11e881aa52540025c377/avatar/407310e7b07629c97d42949e4522f1c8_w395_h395_s71.jpg" width="100px;" alt="Craft_Kevin"/><br /><sub><b>Craft_Kevin</b></sub></a><br /><a href="#financial-Craft_Kevin" title="Financial">💵</a></td>
  </tr>
  <tr>
    <td align="center"><a href="https://afdian.net/u/c0ff1996ab5911e8ac0152540025c377"><img src="https://pic.afdiancdn.com/user/c0ff1996ab5911e8ac0152540025c377/avatar/8743119a6dbbfeb3b986472835a7accb_w413_h456_s155.jpg" width="100px;" alt="陌余Oucher"/><br /><sub><b>陌余Oucher</b></sub></a><br /><a href="#financial-陌余Oucher" title="Financial">💵</a></td>
    <td align="center"><a href="https://www.mcbbs.net/home.php?mod=space&uid=145106"><img src="https://www.mcbbs.net/uc_server/avatar.php?uid=145106&size=middle" width="100px;" alt="龙腾猫跃"/><br /><sub><b>龙腾猫跃</b></sub></a><br /><a href="#financial-龙腾猫跃" title="Financial">💵</a></td>
    <td align="center"><a href="https://search.mcbbs.net/home.php?mod=space&uid=641356"><img src="https://www.mcbbs.net/uc_server/avatar.php?uid=641356&size=middle" width="100px;" alt="雪颜の顾"/><br /><sub><b>雪颜の顾</b></sub></a><br /><a href="https://github.com/SPGoding/datapack-language-server/issues?q=author%3A雪颜の顾" title="Bug reports">🐛</a></td>
  </tr>
</table>
<!-- markdownlint-enable -->
<!-- prettier-ignore-end -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!
