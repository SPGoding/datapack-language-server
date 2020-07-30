import { DocumentHighlight, Position } from 'vscode-languageserver'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { DocNode } from '../types'
import { getCacheFromOffset, getSafeCategory } from '../types/ClientCache'
import { McfunctionDocument } from '../types/DatapackDocument'
import { onSelectionRanges } from './onSelectionRanges'

export function onDocumentHighlight({ offset, doc, node, position, textDoc }: { position: Position, offset: number, doc: McfunctionDocument, node: DocNode, textDoc: TextDocument }): DocumentHighlight[] {
    /* istanbul ignore next */
    const result = getCacheFromOffset(node.cache || {}, offset)
    if (result) {
        // Highlight all the references/definitions of the selected stuff.
        const ans: DocumentHighlight[] = []

        for (const node of doc.nodes) {
            const unit = getSafeCategory(node.cache, result.type)[result.id]
            /* istanbul ignore else */
            if (unit) {
                const ref = [...unit.def, ...unit.ref]
                /* istanbul ignore else */
                if (ref.length > 0) {
                    ans.push(...ref.map(v => ({
                        range: {
                            start: textDoc.positionAt(v.start),
                            end: textDoc.positionAt(v.end)
                        }
                    })))
                }
            }
        }

        return ans
    }

    // Highlight the selected token.
    return onSelectionRanges({ doc, textDoc, positions: [position] })
}
