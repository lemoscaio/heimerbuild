type PatchNoticeProps = {
	requestedPatch: string
	patch: string
}

export function PatchNotice({ requestedPatch, patch }: PatchNoticeProps) {
	return (
		<p className="bg-primary-3 px-4 pt-2 text-lilac text-xs" role="status">
			Patch {requestedPatch} is no longer available. Showing this build on patch{" "}
			{patch}.
		</p>
	)
}
