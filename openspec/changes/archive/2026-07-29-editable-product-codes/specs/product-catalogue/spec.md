## ADDED Requirements

### Requirement: Product code structure

A product code SHALL have the form `{CATEGORY_ABBR}-{SEQ}-{NAME_ABBR}`, where `CATEGORY_ABBR` is derived from the category name, `SEQ` is a three-digit number counted within that category, and `NAME_ABBR` is derived from the product name and capped at ten characters. Example: `NLT-001-MTLB`.

The category abbreviation SHALL NOT be stored as a separate field. It SHALL be derived from the category name so the two cannot drift apart.

Sequence numbers SHALL be allocated from the highest number currently in use within the category, so a deleted product's number is not reissued.

#### Scenario: Code assembled from category, sequence and name

- **WHEN** a code is suggested for "Mít trái lá bàng" in category "Nguyên liệu trái"
- **THEN** the code is `NLT-001-MTLB`

#### Scenario: Sequences are independent per category

- **WHEN** category "Nguyên liệu trái" already contains `NLT-012-X` and a product is added to "Bao bì"
- **THEN** the suggested code is `BB-001-…`, not `BB-013-…`

#### Scenario: A deleted number is not reissued

- **WHEN** a category contains `NLT-001` and `NLT-007` and a product is added
- **THEN** the suggested sequence is `008`

### Requirement: Abbreviation rules

Abbreviation SHALL strip Vietnamese diacritics, including `đ`/`Đ` which Unicode NFD does not decompose, so a code contains only `A-Z` and digits.

A token that is a run of digits, or that is already written in capitals in the source text, SHALL be kept whole rather than reduced to its initial letter. All other words SHALL contribute their first letter.

When a length cap applies, truncation SHALL occur on a token boundary, so a digit group is never split.

#### Scenario: Diacritics removed

- **WHEN** "Keo đèn côn trùng" is abbreviated
- **THEN** the result is `KDCT`

#### Scenario: Acronym preserved

- **WHEN** "Túi PE 60" is abbreviated
- **THEN** the result is `TPE60`, not `TP60`

#### Scenario: Truncation does not split a number

- **WHEN** "Túi PE 60*100" is abbreviated with a ten-character cap
- **THEN** the result is `TPE60100`, and with a six-character cap it is `TPE60`, never `TPE601`

#### Scenario: Name abbreviation distinguishes similar products

- **WHEN** "Mít sấy Lá Bàng loại vụn to" and "Mít sấy Lá Bàng loại vụn nhỏ" are abbreviated
- **THEN** their name parts differ

### Requirement: User-editable product code

The product code SHALL be editable by the user on both create and update. The system SHALL offer a suggestion but SHALL NOT own the value.

A code SHALL be rejected when it is already used by a different product. Re-saving a product without changing its code SHALL NOT be treated as a conflict. A blank code on update SHALL be rejected.

The system SHALL NOT parse a stored code to derive meaning, so a hand-edited code that does not follow the format continues to work.

#### Scenario: Hand-typed code is kept

- **WHEN** the user enters `NLT-099-TUCHON` and saves
- **THEN** the product is created with that exact code and no suggestion overwrites it

#### Scenario: Empty code falls back to a suggestion

- **WHEN** the user leaves the code blank and the product has a name and a category
- **THEN** the system generates a code from them

#### Scenario: Duplicate code rejected

- **WHEN** the user enters a code already held by another product
- **THEN** the save is rejected with a message naming the code

#### Scenario: Saving an unchanged code is not a conflict

- **WHEN** the user edits only the product name and saves
- **THEN** the save succeeds

### Requirement: Code suggestion from name and category

The system SHALL suggest a code once the product name and category are both known, and SHALL return no suggestion when the category is absent, since the prefix is not derivable without it.

Automatic suggestion SHALL stop once the user has edited the code, so a hand-typed code is never silently replaced. An explicit request for a suggestion SHALL override the current value.

#### Scenario: Suggestion appears after name and category are entered

- **WHEN** the user has entered a product name and selected a category, and has not edited the code
- **THEN** a suggested code appears in the code field

#### Scenario: No suggestion without a category

- **WHEN** the user has entered a name but no category
- **THEN** no code is suggested

#### Scenario: A typed code is not overwritten

- **WHEN** the user types a code and then corrects the product name
- **THEN** the typed code remains

### Requirement: Category rename rewrites product codes

Renaming a category SHALL rewrite the category segment of every code in that category that follows the three-segment format, preserving the sequence and name segments. Codes not in that format SHALL be left unchanged.

The rename and all code rewrites SHALL occur in a single transaction, so a category name and its products' code prefixes cannot disagree.

Before saving, the system SHALL present the exact set of `old code → new code` pairs for confirmation, and SHALL separately report the codes that will not change.

A rename SHALL be refused when a rewritten code would collide with a product outside the category.

#### Scenario: Prefix rewritten, sequence and name kept

- **WHEN** category "Nguyên liệu trái" (`NLT`) is renamed to "Nguyên liệu trái tươi" (`NLTT`)
- **THEN** `NLT-001-MTLB` becomes `NLTT-001-MTLB`

#### Scenario: Legacy codes left alone

- **WHEN** a category containing `NLT-TMITL` is renamed
- **THEN** that code is unchanged and is reported as unchanged

#### Scenario: Preview before saving

- **WHEN** the user submits a new category name
- **THEN** the changes are listed for confirmation and nothing is written until confirmed

#### Scenario: Rename refused on code collision

- **WHEN** a rewritten code is already held by a product in another category
- **THEN** the rename is refused and names the conflicting code

### Requirement: Category abbreviations must be unique

The system SHALL refuse to create or rename a category when its name abbreviates to the same prefix as an existing category, and SHALL name the conflicting category. The system SHALL NOT resolve the collision automatically, since a generated suffix would produce a prefix that cannot be predicted from the name.

A category name containing no letters or digits SHALL be rejected.

#### Scenario: Colliding abbreviation refused

- **WHEN** "Nhiên liệu" (`NL`) is added while "Nguyên liệu" (`NL`) exists
- **THEN** the save is refused, naming the conflicting category

#### Scenario: Name with no usable characters refused

- **WHEN** a category name consists only of punctuation
- **THEN** the save is refused

### Requirement: Đơn vị tính on products

A product SHALL carry a unit of measure (`donViTinh`), editable in the create and edit form and visible in the product list, the detail view and the Excel export.

The field SHALL accept free text with common units offered as suggestions, so a new unit does not require a code change.

#### Scenario: Unit shown in the list

- **WHEN** the product list is displayed
- **THEN** each product shows its unit, or a placeholder when it has none

#### Scenario: Unit included in the export

- **WHEN** the catalogue is exported to Excel
- **THEN** the sheet contains an "Đơn vị tính" column

### Requirement: Auto-created products receive a well-formed code

When a product is created automatically while receiving stock or recording finished output, its code SHALL be generated by the shared code rule.

Code generation SHALL NOT select existing codes by leading-substring match on a category prefix, because unrelated codes can share those leading characters.

A product created without a category SHALL be marked as unclassified rather than filed under a plausible-looking category, so it is visible as needing review.

#### Scenario: Codes sharing a prefix substring do not corrupt generation

- **WHEN** codes `SPK-MSV2` and `SPD-XOAIK20` exist and a product is auto-created
- **THEN** the generated code is well-formed and contains no `NaN`

#### Scenario: Missing category is explicit

- **WHEN** a product is auto-created without a category
- **THEN** it is assigned an explicitly unclassified category
