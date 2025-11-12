import * as vscode from 'vscode';
import pkg from '../package.json';
import * as fs from 'fs';
import * as path from 'path';

// Reads the configuration of the extension from the VS Code settings

function getConfig() {
    const config = vscode.workspace.getConfiguration('classfiller');

    const enable = config.get<boolean>('enable');
    const insertPos = config.get<string>('insertPosition', pkg.contributes.configuration.properties['classfiller.insertPosition'].default);
    const headerExt = config.get<string[]>('headerExtensions', pkg.contributes.configuration.properties['classfiller.headerExtensions'].default);
    const needToInclude = config.get<boolean>('includeIfNecessary', pkg.contributes.configuration.properties['classfiller.includeIfNecessary'].default);

    return {enable, insertPos, headerExt, needToInclude};
}

// Finds matching header files (whose names are the same to the opened file) in the current folder.
// Gets the path of .cpp file as a string ans returns the path of matching header as a string (or null, if no such header was found).

// For example, if we have files abacaba.cpp, abacaba.hpp, abacaba.jpg and another_header.hpp in the same folder,
// this function will return the string 'abacaba.hpp'

function findMatchingHeaderPath(cppPath: string, headerExtensions: string[]): string | null {
    const base = path.basename(cppPath, path.extname(cppPath));
    let tryNames = [];
    for (let i = 0; i < headerExtensions.length; ++i) {
        tryNames.push(base + '.' + headerExtensions[i]);
    }
    
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders) {
        for (const wf of workspaceFolders) {
            for (const name of tryNames) {
                console.log(name);
                const p = path.join(wf.uri.fsPath, name);
                if (fs.existsSync(p)) return p;
            }
        }    
    }

    return null;
}

// Finds and collects all class/struct definitions from the header.
// Gets the text of the opened file, returns the array of definitions.
// Each element of the array contains the name of the class/structure and all the definitions.

function extractClassesFromHeader(text: string): Array<{ name: string, body: string,}> {
    const classes: Array<{ name: string, body: string}> = [];
    let idx = 0;

    while (idx < text.length) {
        const classMatch = text.slice(idx).match(/^\s*(class|struct)\s+([A-Za-z_][A-Za-z0-9_]*)\b/);
        if (classMatch && classMatch.index === 0) {
            const kind = classMatch[1];
            const name = classMatch[2];
            idx += classMatch[0].length;

            const openIdx = text.indexOf('{', idx);
            if (openIdx === -1) break;
            
            let depth = 0;
            let i = openIdx;
            for (; i < text.length; ++i) {
                if (text[i] === '{') ++depth;
                else if (text[i] === '}') {
                    depth--;
                    if (depth === 0) break;
                }
            }
            if (i >= text.length) break;
            const body = text.slice(openIdx + 1, i);
            classes.push({name, body});
            idx = i + 1;
        } else {
            const next = text.slice(idx + 1).search(/(class\s+|struct\s+)/);
            if (next === -1) break;
            idx = idx + 1 + next;
        }
    }
    return classes;
}

// Finds and collects all declarations of class/struct functions from the header.
// Gets the body of the class (list of all functions in it), returns the array of declarations as strings.

function collectMethodDeclarations(classBody: string): string[] {
    const decls: string[] = [];
    let buf = '';
    let i = 0;

    while (i < classBody.length) {
        let ch = classBody[i];

        buf += ch;

        if (ch === ';' || ch === ':') {
            const s = buf.trim();
            buf = '';
            
            if (/^(public|protected|private)\s*:/.test(s)) { i++; continue; }
            if (/^(using|enum|struct|class|friend\s+)/.test(s)) { i++; continue; }
            if ((!s.includes('(')) || (!s.includes(')'))) { i++; continue; }
            if (/\=\s*0\s*;/.test(s)) { i++; continue; }
            
            decls.push(s.replace(/\s+/g, ' ').trim());
        }
        i++;
    }
    
    return decls;
}

// Transforms a definition to a declaration: adds the name of class/structure, braces, the comment "TODO: implement" and the return line
// Gets the declaration string and the class name as a string. Returns the transformed string.

/* For example, for the integer function foo from the class SomeClass, this function will return:
int SomeClass:foo() {
    // TODO: implement
    return 0;
}
*/

function makeDefinitionFromDecl(decl: string, className: string): string | null {
    decl = decl.trim();
    if (decl.endsWith(';')) decl = decl.slice(0, decl.length - 1).trim();

    const openParam = decl.indexOf('(');
    if (openParam === -1) return null;
    let depth = 0;
    let i = openParam;
    for (; i < decl.length; ++i) {
        if (decl[i] === '(') ++depth;
        else if (decl[i] === ')') {
            depth--;
            if (depth === 0) break;
        }
    }
    if (i >= decl.length) return null;
    const closeParam = i;

    let beforeParam = decl.slice(0, openParam).trim();
    const param = decl.slice(openParam + 1, closeParam).trim();
    const afterParam = decl.slice(closeParam + 1, decl.length).trim();

    beforeParam = beforeParam.replace(/^(virtual|inline|static|friend)\s+/g, '').trim();

    const parts = beforeParam.split(/\s+/);
    const name = parts[parts.length - 1];
    const returnType = parts.slice(0, parts.length - 1).join(' ');

    const isCtor = (name === className);
    const isDtor = (name === ('~' + className));

    const qualified = `${className}::${name}`;

    let out = '';

    if (isCtor || isDtor) {
        out += `${qualified}(${param})${afterParam}\n{\n    // TODO: implement\n}\n\n`;
    } else {
        const r = returnType || 'void';
        out += `${r} ${qualified}(${param})${afterParam}\n{\n`;
        let returnString = 'return;';
        if (r === 'bool') returnString = 'return true;';
        else if (r.includes('float') || r.includes('double')) returnString = 'return 0.0;';
        else if (r.includes('*')) returnString = 'return nullptr;';
        else if (r === 'string') returnString = 'return \"\";';
        else if (/(int|long|short)\s+/.test(r) && !r.includes('<')) returnString = 'return 0;';
        out += `    // TODO: implement\n`;
        out += '    ' + returnString + `\n}\n\n`;
    }

    return out;
}

// Activates the extension: registers commands "hello" (checking that the extension is working),
// "version" (getting the version number) and "generateCppDefsFromHeader".

export function activate(context: vscode.ExtensionContext) {
    const generator = vscode.commands.registerCommand('classfiller.generateCppDefsFromHeader', () => {
        const config = getConfig();
        if (!config.enable) return;

        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('Please open a code file'); 
            return; 
        }

        const file = editor.document;
        if (!file.fileName.endsWith('.cpp') && !file.fileName.endsWith('.cxx')) {
            vscode.window.showErrorMessage('Please open a .cpp/.cxx file');
            return;
        }

        const cppPath = file.fileName;
        const cppText = file.getText();

        const headerPath = findMatchingHeaderPath(cppPath, config.headerExt);
        if (!headerPath) { 
            vscode.window.showErrorMessage('No matching header for this file. Maybe you should check the Classfiller: Header extensions setting');
            return; 
        }

        let headerText: string;
        try {
            headerText = fs.readFileSync(headerPath, 'utf8');
        } catch (e) {
            vscode.window.showErrorMessage('Can\'t read the header: ' + headerPath);
            return;
        }

        const classes = extractClassesFromHeader(headerText);
        if (classes.length === 0) { 
            vscode.window.showInformationMessage('No classes/structs in the header ' + headerText); 
            return; 
        }

        let afterIncludePos : vscode.Position;
        let wasNecessaryInclude = false;
        let lastIncludeLine = -1;
        for (let i = 0; i < file.lineCount; ++i) {
            if (/^.*#include.*$/m.test(file.lineAt(i).text)) {
                lastIncludeLine = i;
                if (file.lineAt(i).text.includes(path.basename(headerPath))) {
                    wasNecessaryInclude = true;
                }
            }
        }

        let defs = '';
        if (config.needToInclude === true && wasNecessaryInclude === false) {
            defs += '#include \"' + path.basename(headerPath) + '\"\n';
        }
        for (const cls of classes) {
            const decls = collectMethodDeclarations(cls.body);
            if (decls.length === 0) continue;

            defs += '\n// ----- CLASS/STRUCTURE ' + cls.name + '----- //\n';

            for (const d of decls) {
                const def = makeDefinitionFromDecl(d, cls.name);
                if (def) defs += def;
            }
        }

        if (!defs) {
            vscode.window.showInformationMessage('No definitions in the header file ' + headerText);
            return;
        }

        let pos : vscode.Position = editor.selection.active;
        if (config.insertPos === 'endOfFile') {
            pos = file.lineAt(file.lineCount - 1).range.end;
        } else if (config.insertPos === 'afterIncludes') {
            if (lastIncludeLine !== -1) {
                pos = file.lineAt(lastIncludeLine).range.end;
            } else {
                pos = file.lineAt(0).range.start;
            }
        }

        editor.edit(editBuilder => {
            if (editor.selection.isEmpty) {
                editBuilder.insert(pos, '\n' + defs);
            } else {
                editBuilder.replace(editor.selection, defs);
            }
        });

        vscode.window.showInformationMessage('All realizations are generated successfully!');
    });

    const hello = vscode.commands.registerCommand('classfiller.helloWorld', () => {
        if (!getConfig().enable) return;
        vscode.window.showInformationMessage('Hello from ClassFiller!\nThe extension is now active.');
    });

    const version = vscode.commands.registerCommand('classfiller.version', () => {
        if (!getConfig().enable) return;
        const version = pkg.version;
        vscode.window.showInformationMessage('Version of ClassFiller: ' + version);
    });

    context.subscriptions.push(generator);
    context.subscriptions.push(hello);
    context.subscriptions.push(version);
}

// Deactivates the extension

export function deactivate() {}
