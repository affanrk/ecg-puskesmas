import { CheckCircle, XCircle, MapPin, User } from 'lucide-react';
import { AdditionalLocationRequest } from '@/types/models';

interface LocationRequestTableRowProps {
    request: AdditionalLocationRequest;
    onApprove: (request: AdditionalLocationRequest) => void;
    onReject: (request: AdditionalLocationRequest) => void;
}

export default function LocationRequestTableRow({ request, onApprove, onReject }: LocationRequestTableRowProps) {
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <tr className="hover:bg-slate-50/50 transition-colors">
            <td className="px-5 py-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <User size={20} className="text-blue-600" />
                    </div>
                    <div>
                        <p className="font-medium text-slate-800">
                            {request.user?.full_name || request.user?.username || 'Unknown'}
                        </p>
                        <p className="text-xs text-slate-500">
                            {request.user?.role || 'Staff'}
                        </p>
                    </div>
                </div>
            </td>
            <td className="px-5 py-4">
                <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-slate-400" />
                    <span className="font-medium text-slate-700">
                        {request.location?.name || 'Unknown Location'}
                    </span>
                </div>
            </td>
            <td className="px-5 py-4">
                <p className="text-slate-600">
                    {request.requester?.full_name || request.requester?.username || 'System'}
                </p>
            </td>
            <td className="px-5 py-4">
                <p className="text-slate-600 max-w-xs truncate">
                    {request.reason || '-'}
                </p>
            </td>
            <td className="px-5 py-4">
                <p className="text-slate-600 text-xs">
                    {formatDate(request.created_dt)}
                </p>
            </td>
            <td className="px-5 py-4">
                <div className="flex items-center justify-end gap-2">
                    <button
                        onClick={() => onApprove(request)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium transition-all shadow-sm"
                    >
                        <CheckCircle size={14} />
                        Approve
                    </button>
                    <button
                        onClick={() => onReject(request)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium transition-all shadow-sm"
                    >
                        <XCircle size={14} />
                        Reject
                    </button>
                </div>
            </td>
        </tr>
    );
}
