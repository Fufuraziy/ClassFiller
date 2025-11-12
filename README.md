# ClassFiller README

> Welcome to the extension ClassFiller!\
This extension will help you in writing huge classes and libraries.

## Features

The extension has **3** features:
1. Checking that it's active.
2. Getting the message with the current version of the extension.
3. Generating function definitions from the declarations in the header file.

Each command can be run from the VS code command menu (press `Ctrl + Shift + P` or `Cmd + Shift + P` on Mac) and typing "classfiller" here. After doing this you will see the list of possible commands.\
The generator command (#3) also can be run using the hotkey combination `Ctrl + Shift + G` (or `Cmd + Shift + G` on Mac).

> [!WARNING]
> Before running the Generator command make sure that there's matching header:\
> 1. It should be named **EXACTLY** as the code file you are running the command from
> 2. It should be **IN THE SAME FOLDER** with that code file.


## Extension Settings

The extension can be configured using the VS Code settings.\
To access these settings, go to `File → Preferences → Settings` or simply press `Ctrl + ,` (`Cmd + ,` on Mac) and type "classfiller". You will see 4 settings:
1. "Enable": **enables or disables** the extension (enabled by default).
2. "InsertPosition": you can configure **where the extension will put generated declarations**: where the cursor is, at the end of the file or after the last #include of the file. By default the extension will put the code where the cursor is.
3. "HeaderExtensions": you can configure **file extensions that will be counted as headers** (by default $-$ .h and .hpp).
4. "IncludeIfNecessary": if the extension will find the matching header file, it will **include it** if it isn't already included (disabled by default);

## Release Notes

### 1.0.0

Initial release of the extension "ClassFiller"

## Contributors:

Tuleninov Michael, M3103

**Enjoy!**
