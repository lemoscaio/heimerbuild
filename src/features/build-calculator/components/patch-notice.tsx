type PatchNoticeProps = {
	requestedPatch: string
	patch: string
}

export function PatchNotice({ requestedPatch, patch }: PatchNoticeProps) {
	return (
		<p className="champion-info__patch-notice" role="status">
			Patch {requestedPatch} is no longer available. Showing this build on patch{" "}
			{patch}.
		</p>
	)
}
