import { getCodeAction, quoteString } from '../utils'
import { McfunctionDocument } from '../types/DatapackDocument'
import { IndexMapping } from '../types/IndexMapping'
import { ErrorCode } from '../types/ParsingError'
import { TextRange } from '../types/TextRange'
import { ArgumentNode, DiagnosticMap, GetCodeActions, NodeRange, NodeType } from './ArgumentNode'

export class StringNode extends ArgumentNode {
    readonly [NodeType]: string = 'String'

    constructor(
        public value: string,
        public raw: string,
        public mapping: IndexMapping
    ) {
        super()
    }

    toString() {
        return this.raw
    }

    valueOf() {
        return this.value
    }

    /**
     * Return code actions for changing quotation marks when relevant diagnostics exist.
     */
    [GetCodeActions](uri: string, info: McfunctionDocument, range: TextRange, diagnostics: DiagnosticMap) {
        const ans = super[GetCodeActions](uri, info, range, diagnostics)

        const unquoteDiagnostics = diagnostics[ErrorCode.StringUnquote]
        const doubleQuoteDiagnostics = diagnostics[ErrorCode.StringDoubleQuote]
        const singleQuoteDiagnostics = diagnostics[ErrorCode.StringSingleQuote]

        if (unquoteDiagnostics && unquoteDiagnostics.length > 0) {
            ans.push(getCodeAction(
                'string-unquote', unquoteDiagnostics,
                info.document, this[NodeRange],
                this.value
            ))
        }
        if (doubleQuoteDiagnostics && doubleQuoteDiagnostics.length > 0) {
            ans.push(getCodeAction(
                'string-double-quote', doubleQuoteDiagnostics,
                info.document, this[NodeRange],
                quoteString(this.value, 'always double', true)
            ))
        }
        if (singleQuoteDiagnostics && singleQuoteDiagnostics.length > 0) {
            ans.push(getCodeAction(
                'string-single-quote', singleQuoteDiagnostics,
                info.document, this[NodeRange],
                quoteString(this.value, 'always single', true)
            ))
        }

        return ans
    }
}
