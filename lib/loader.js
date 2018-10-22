var Twig = require("twig");
var path = require("path");
var hashGenerator = require("hasha");
var mapcache = require("./mapcache");
var compilerFactory = require("./compiler");
var getOptions = require("./getOptions");
Twig.cache(false);
var FakeReact = {
    createElement: () => void 0,
    Fragement: {},
}
function genStyleds(styles,notExt,extAlias) {
    let idx = -1;
    return styles.map( ({tag,css,name,extName}) => {
        idx++;
        const trg = extName ? `Styled_${extName}_${extAlias}` : tag;
        let genstyle = `
            var StyledCmp_${name||idx} = styled(${trg})\`
                ${css}
            \``;
        if(notExt) genstyle+=`;\nexport {StyledCmp_${name||idx}}`
        return genstyle;
    }).join(';\n')+';\n';
}
function genStyledsOverride(styles) {
    let idx = -1;
    const imp = styles.map( ({extName,name}) => {
        idx++;
        if(!extName) return '';
        return `StyledCmp_${extName} : StyledCmp_${name||idx}`;
    });
    return '{' + imp.join(',') + '}';

}
function genStyledsImport(styles,extendsTpl,extAlias) {
    const imp = styles.filter( s => !!s.extName).map( ({extName}) => {
        return `StyledCmp_${extName} as Styled_${extName}_${extAlias}`;
    });
    if(imp.length) {
        return `import {${imp.join(',')}} from ${extendsTpl};`;
    } else {
        return '';
    }

}

module.exports = function(source) {
    var resPath = require.resolve(this.resource),
        id = hashGenerator(resPath + source),
        options = getOptions(this),
        tpl, comp;

    Twig.extend(function(Twig) {
        var compiler = Twig.compiler;
        compiler.module['webpack'] = compilerFactory(options);
    });

    mapcache.set(id, resPath)

    this.cacheable && this.cacheable();

    tpl = Twig.twig({
        id: id,
        resPath: resPath,
        data: source,
        allowInlineIncludes: true
    });

    tpl = tpl

    comp = tpl.getReactComp({
        React:FakeReact,
        inh: {
            child: {},
            parent:{},
        },
        inc: {

        }
    },{mapToPrimitives:options.mapToPrimitives})
    console.log("🙋🏻‍♂️");
    const haveStyles = tpl.styleBlocks.length;
    const haveRequires = tpl.requires.length;
    let includes = [];
    if(tpl.includes)
        Object.keys(tpl.includes).forEach( inclAlias => {
            let resPath = tpl.includes[inclAlias];
            if(!resPath.match(/\/\\/)) resPath = resPath.slice(0,1) + './' + resPath.slice(1);
            return includes.push(`var ${inclAlias} = require(${resPath}).default;`);
        });
    let extendsTpl = tpl.isExtend, ignoreExtend = false //
    if(tpl.isExtend && options.ignoreExtends) {
        let extendsFname = extendsTpl.replace(/['"]/g,'');
        if(!extendsFname.match(/\/\\/)) extendsFname = path.join(path.dirname(resPath),extendsFname)
        if(options.ignoreExtends.find( ign => ign.indexOf(extendsFname)>=0)) {
            ignoreExtend = true;// disable extend
        }
    }
    let cmpStr = comp.cmpString;
    if(ignoreExtend) {
        extendsTpl = "";
    }
    let extAlias;
    if(extendsTpl) extAlias = extendsTpl.replace(/.*[\//]/,'_').replace(/['"]/g,'').replace(/[-]/g,'_').replace('.twig','');
    if(extendsTpl && !extendsTpl.match(/\/\\/)) extendsTpl = extendsTpl.slice(0,1) + './' + extendsTpl.slice(1);
    var res = `
        var React = require("react");
        ${ extendsTpl ? ' var parent = require(' + extendsTpl + ').default;' : '' }
        ${ extendsTpl ? genStyledsImport(tpl.styleBlocks,extendsTpl,extAlias) : '' }
        ${ haveRequires ? tpl.requires.join(';\n') +';' : '' }
        ${ haveStyles ? ` var styled = require("styled-components${options.mapToPrimitives?'/primitives':''}").default;` : '' }
        ${ options.mapToPrimitives ? "var primi = require('react-primitives')" : '' }
        ${ haveStyles ? genStyleds(tpl.styleBlocks,!extendsTpl,extAlias) : ''}
        ${ extendsTpl ? 'var ovrrdn = ' + genStyledsOverride(tpl.styleBlocks,extendsTpl,extAlias) + ';' : '' }

        ${ includes.length ? includes.join('\n') : '' }
        const R = {
            c: React.createElement,
            F: React.Fragment,
        }
        ${ extendsTpl && comp.blocksStr ? ` var blocks = ${comp.blocksStr.replace(/,__arg_place__/g,',parentCmp')}` : ''}
        ${ !extendsTpl && comp.blocksStr ? ` var rdrBlockOrSelf = (p, block,selfCmp) => block ? block(p,selfCmp) : selfCmp() ` : ''}
        ${ extendsTpl ? `export default (p,ctx) => parent(p,ctx,blocks,ovrrdn)`
                : `export default (p,ctx,blocks,ovrrdn) => ${cmpStr||'null'};`
        }

    `
    this.callback(null, res);
};
