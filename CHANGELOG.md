# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased] - 2026-01-04

### Added
- **HTML Export Functionality**: 
  - Added HTML Clipboard export buttons to the main dashboard tabs: Employees, Tasks, and Requirements.
  - Added HTML Export buttons to all detail modals: Task Details, Requirement Details, Employee Details, and Employee List.
  - Implemented specific logic for exporting Task cards as a table to the clipboard.
- **Toast Notifications**: Replaced all intrusive `alert()` calls with a standardized, non-blocking toast notification system.

### Changed
- **Unified Export Logic**: Standardized the look and feel of export buttons (Excel, PDF, HTML) across the entire application.
- **Task Card UI**: Refined the design of task cards to be more compact and visually appealing.
- **Resource Loading**: Updated resource querying versions to `v=3` to force cache busting for JS and CSS files.

### Fixed
- **RTL Number Formatting**: Fixed an issue where negative numbers in HTML exports would display incorrectly in Right-to-Left contexts by adding explicit LTR styling wrappers.
- **Modal Export Handling**: Fixed inconsistencies where some modals lacked standard export options.

## [Initial Release]
- Basic dashboard functionality with Excel import.
- Employee, Task, and Requirement views.
- PDF and Excel export capabilities.
