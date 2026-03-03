import { FamilyLinkAcceptClient } from './FamilyLinkAcceptClient';

interface Props {
    params: { token: string };
}

export default function FamilyLinkAcceptPage({ params }: Props) {
    return <FamilyLinkAcceptClient token={params.token} />;
}
