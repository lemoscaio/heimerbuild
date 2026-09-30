import type { RichText, TextSpan } from "@schemas/rune"
import { cn } from "@/lib/cn"
import { splitNumbers } from "../lib/split-numbers"

type RuneDescriptionProps = {
	text: RichText
} & Omit<React.ComponentProps<"div">, "children">

/** A long description with its numbers emphasized; paragraphs after the first are fine print. */
export function RuneDescription({
	text,
	className,
	...props
}: RuneDescriptionProps) {
	return (
		<div className={cn("flex flex-col gap-1.5", className)} {...props}>
			{text.map((paragraph, index) => (
				<p
					// Paragraphs have no id; the text never reorders.
					// biome-ignore lint/suspicious/noArrayIndexKey: see above
					key={index}
					className={cn("text-prose text-sm leading-relaxed", {
						"text-subtle text-xs": index > 0,
					})}
				>
					{paragraph.map((line, lineIndex) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: lines are positional
						<span key={lineIndex} className="block">
							{line.map((span, spanIndex) => (
								// biome-ignore lint/suspicious/noArrayIndexKey: spans are positional
								<Span key={spanIndex} span={span} />
							))}
						</span>
					))}
				</p>
			))}
		</div>
	)
}

function Span({ span }: { span: TextSpan }) {
	return (
		<span
			className={cn({
				"font-semibold text-white": span.strong,
				italic: span.italic,
			})}
		>
			{splitNumbers(span.text).map((part, index) =>
				part.isNumber ? (
					// biome-ignore lint/suspicious/noArrayIndexKey: parts are positional
					<b key={index} className="font-semibold text-success">
						{part.text}
					</b>
				) : (
					part.text
				),
			)}
		</span>
	)
}
