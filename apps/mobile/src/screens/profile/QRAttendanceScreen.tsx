import React from 'react';
import { PlaceholderScreen } from '../../components';
import type { ProfileScreenProps } from '../../navigation/types';

export const QRAttendanceScreen: React.FC<ProfileScreenProps<'QRAttendance'>> = () => (
    <PlaceholderScreen
        title="QR Attendance"
        description="Scan QR codes for class attendance using the device camera."
        plannedFeatures={[
            'expo-camera barcode scanner',
            'Attendance confirmation animation',
            'History of scanned attendance',
        ]}
    />
);
