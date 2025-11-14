# ClassFiller documentation

> [!TIP]
> This is the documentation. Basics about how the extension works can be found in `README.md`

## Functions:
- **getConfig**:\
*Gets*: Nothing.\
Reads the configuration of the extension from the VS Code settings (current 
settings values are taken from package.json).\
*Returns*: Array of settings.

- **findMatchingHeaderPath**:\
*Gets*: Path of opened C++-code file, array of possible header file's extensions.\
Finds matching header files (whose names are the same to the opened file) in the current folder.\
Extracts current folder name from .cpp file name and searches in it for the header file (possible file extensions of the header are set by the array `headerExtensions`) with the exact same name.\
*Returns*: Header name as a string. Else returns `null`.\
*Example*: for the file "filename.cpp" it will search for "filename.h" or "filename.hpp" in the folder and fill return "FolderName/filename.header_extension".

- **extractClassesFromHeader**:\
*Gets*: Text from the header file.\
Finds and collects all class/struct definitions from the header which was found by `findMatchingHeaderPath`.\
Searches the header file for `class` or `struct` key words. After finding one, collects the definitions (all what is inside braces) and saving it in the array in pair with the class name.\
*Returns*: Array of pairs of class name and class body.\
*Example*: if class ClassName has 2 functions (for example, `int int_foo()` and `void void_foo(int a)`), the function will return "ClassName" as a name and names of the functions as a class body.

- **collectMethodDeclarations**:\
*Gets*: Text from the class body.\
Finds and collects all declarations of class/struct functions from the header.\
Scans the class body (it was found by `extractClassesFromHeader`) for the function definitions (lines that end with `;`). Then checks that it is a function (there should not be key words `public/protected/private` and `using/enum/struct/class/friend`, also should include `(` and `)` and doesn't include expressions like `= some_number;`). If all checks were successfull, puts the declaration as a string in the declaration array (which is returned in the end).\
*Returns*: Array of the function declarations as strings.\
*Example*: From the class described about the function will extract strings `"int int_foo()"` and `"void void_foo(int a)"`.

- **makeDefinitionFromDecl**:\
*Gets*: Declaration string, class name string.\
Transforms a definition to a declaration by several steps:
    1. Inserts the name of class/struct before the name of the current function.
    2. Deletes key words `virtual/inline/static/friend`.
    3. Adds braces and the line `// TODO: implement`.
    4. Adds a return line based on the returned type;\
*Returns*: The definition transformed to the declaration or `null` if the function got not a declaration.\
*Example*: The function will tranform the function `int int_func()` from the class `Foo` to the string:\
`"int Foo::int_func()`\
`{`\
    `// TODO: implement`\
    `return 0;`\
`}"`

- **activate**:\
*Gets*: VS Code extension context.\
Activates the extension: registers commands `hello` (checking that the extension is working), `version` (getting the version number) and `generateCppDefsFromHeader` (continuosly calling all the functions described earlier and checking that all of them are successful: the C++-code is opened, the matching header file was found and opened, classes/structs found in the header, definitions found in the classes/structs).\
*Returns*: Nothing, just runs the extension.

- **deactivate**:\
Gets, does and returns nothing. Just deactivating the extension.