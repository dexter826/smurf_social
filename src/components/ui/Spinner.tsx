import React from 'react';
import { Loader2 } from 'lucide-react';

export const Spinner = () => (
    <div className="flex justify-center items-center p-4">
        <Loader2 className="animate-spin text-primary-500" size={32} />
    </div>
);
