import { AdditionalLocationRequest } from '@/types/models';
import ConfirmationModal from '@/components/shared/ConfirmationModal';

interface LocationRequestModalsProps {
    approvingRequest: AdditionalLocationRequest | null;
    rejectingRequest: AdditionalLocationRequest | null;
    rejectionReason: string;
    onCloseApproving: () => void;
    onCloseRejecting: () => void;
    onRejectionReasonChange: (reason: string) => void;
    onConfirmApprove: () => void;
    onConfirmReject: () => void;
    loading: boolean;
}

export default function LocationRequestModals({
    approvingRequest,
    rejectingRequest,
    rejectionReason,
    onCloseApproving,
    onCloseRejecting,
    onRejectionReasonChange,
    onConfirmApprove,
    onConfirmReject,
    loading
}: LocationRequestModalsProps) {
    return (
        <>
            <ConfirmationModal
                isOpen={!!approvingRequest}
                onClose={onCloseApproving}
                onConfirm={onConfirmApprove}
                title="Approve Request?"
                message={
                    <div className="space-y-3">
                        <p className="text-slate-600">You are about to approve the request to add:</p>
                        <p className="font-bold text-lg text-green-700">
                            {approvingRequest?.user?.full_name || approvingRequest?.user?.username}
                        </p>
                        <p className="text-slate-600">to location:</p>
                        <p className="font-bold text-lg text-blue-700">
                            {approvingRequest?.location?.name}
                        </p>
                        <p className="text-sm text-slate-500 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                            This will create a new location assignment for the staff member.
                        </p>
                    </div>
                }
                confirmText="Approve Request"
                isLoading={loading}
            />

            <ConfirmationModal
                isOpen={!!rejectingRequest}
                onClose={onCloseRejecting}
                onConfirm={onConfirmReject}
                title="Reject Request?"
                message={
                    <div className="space-y-4">
                        <p className="text-slate-600">You are about to reject the request from:</p>
                        <p className="font-bold text-lg text-red-700">
                            {rejectingRequest?.user?.full_name || rejectingRequest?.user?.username}
                        </p>
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-slate-700">
                                Rejection Reason <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                value={rejectionReason}
                                onChange={(e) => onRejectionReasonChange(e.target.value)}
                                placeholder="Please provide a reason for rejection..."
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
                                rows={3}
                            />
                        </div>
                        <p className="text-sm text-red-600 font-medium bg-red-50 px-3 py-2 rounded-lg border border-red-200">
                            ⚠️ The staff member will be notified of the rejection.
                        </p>
                    </div>
                }
                confirmText="Reject Request"
                isDestructive={true}
                warningLevel="standard"
                isLoading={loading}
            />
        </>
    );
}
