import {
    Users, // SIMONE (user & manajemen)
    Headphones, // FINESSE (call center)
    FileText, // CRM
    ClipboardList, // APKT
    Layers, // ACMT & SIP
    UserCheck, // SIP
    MessageCircle, // Chat
    ShieldCheck, // SYSCCA
    Activity, // P2APST
    Zap, // ListriQu / ITSM
} from 'lucide-react';

export interface MenuLink {
    name: string;
    url: string;
}

export interface Menu {
    title: string;
    icon: typeof Users;
    color: string;
    links: MenuLink[];
}

export const menus: Menu[] = [
    {
        title: 'SIMONE',
        icon: Users,
        color: 'from-blue-600 to-indigo-600',
        links: [
            { name: 'SEVIA', url: 'http://10.14.150.170:8080/sevia/login' },
            { name: 'Simone Manajemen', url: 'http://10.14.150.160/simonev2/' },
            { name: 'Simone CSO & BO', url: 'http://10.14.150.146/simonev2/' },
        ],
    },
    {
        title: 'FINESSE',
        icon: Headphones,
        color: 'from-blue-600 to-indigo-600',
        links: [
            {
                name: 'Finesse',
                url: 'https://dcpccefnsa.cc.iconpln.co.id/desktop/logon.html?locale=en%20US&fromlogout=true',
            },
            {
                name: 'Finesse DRC',
                url: 'https://drcpccefnsb.cc.iconpln.co.id/desktop/logon.html?locale=en_US',
            },
            {
                name: 'Ece',
                url: 'https://10.14.155.137/system/web/apps/login/',
            },
        ],
    },
    {
        title: 'CRM',
        icon: FileText,
        color: 'from-blue-600 to-indigo-600',
        links: [
            { name: 'CRM', url: 'http://10.14.152.42:8080/crmv3/loginpage' },
            {
                name: 'CRM Domain',
                url: 'http://crm.cc.iconpln.co.id:8080/crmv3/loginpage',
            },
            { name: 'CRM New', url: 'http://10.14.155.34/crmapkt/login' },
        ],
    },
    {
        title: 'APKT - AP2T',
        icon: ClipboardList,
        color: 'from-blue-600 to-indigo-600',
        links: [
            { name: 'New APKT', url: 'https://new-apkt.pln.co.id/login' },
            // { name: 'New AP2T', url: 'http://10.68.35.109/crm/' },
            { name: 'New AP2T', url: 'http://newap2t.pln.co.id/crm/' },
            { name: 'AP2T', url: 'https://10.72.35.8/ap2t/Login.aspx' },
        ],
    },
    {
        title: 'Q-Frame - ACMT',
        icon: Layers,
        color: 'from-blue-600 to-indigo-600',
        links: [
            { name: 'Q-Frame', url: 'http://10.14.155.91/qframe/login/' },
            { name: 'ACMT', url: 'https://10.72.35.8/acmt/' },
            { name: 'Si Ujang', url: 'https://siujang.esdm.go.id/' },
        ],
    },
    {
        title: 'SIP - Mail - AD',
        icon: UserCheck,
        color: 'from-blue-600 to-indigo-600',
        links: [
            { name: 'SIP', url: 'http://10.14.150.147/sip/login' },
            {
                name: 'Email PLN 123',
                url: 'https://hosting3.iconpln.net.id:2096/',
            },
            { name: 'Adss Password', url: 'http://10.14.155.34/adss/' },
        ],
    },
    {
        title: 'P2APST',
        icon: Activity,
        color: 'from-blue-600 to-indigo-600',
        links: [
            {
                name: 'P2APST Ganjil',
                url: 'http://10.70.1.78/dacen/default/index.php',
            },
            {
                name: 'P2APST Genap',
                url: 'https://10.68.35.68/dacen/default/index.php',
            },
            { name: 'Cubemap', url: 'http://10.14.155.34/dashboardv3/login' },
        ],
    },

    {
        title: 'Chat - Man CC',
        icon: MessageCircle,
        color: 'from-blue-600 to-indigo-600',
        links: [
            { name: 'Chat CC', url: 'http://10.14.155.34/chat123/' },
            { name: 'Man CC', url: 'http://10.73.2.13/mancc_123/' },
            {
                name: 'Man CC APKT Down',
                url: 'http://10.14.150.146/mancc_123/login',
            },
        ],
    },
    {
        title: 'TELESALES',
        icon: Headphones,
        color: 'from-blue-600 to-indigo-600',
        links: [
            {
                name: 'Socket SYSCCA Telesales',
                url: 'https://10.14.155.92:3033/',
            },
            {
                name: 'SYSCCA Teleoutbound',
                url: 'https://10.1.50.29:8080/teleoutbound/login',
            },
            {
                name: 'SYSCCA Telesales',
                url: 'https://10.14.155.92/agentdesktop',
            },
        ],
    },
    {
        title: 'SYSCCA',
        icon: ShieldCheck,
        color: 'from-blue-600 to-indigo-600',
        links: [
            { name: 'Socket SYSCCA New SRST', url: 'https://10.73.2.11:3033/' },
            { name: 'SYSCCA New SRST', url: 'https://10.73.2.11/agentdesktop' },
            { name: 'Dashboard SYSCCA', url: 'http://10.73.2.11/iconplus/' },
        ],
    },
    {
        title: 'ListriQu - ITSM',
        icon: Zap,
        color: 'from-blue-600 to-indigo-600',
        links: [
            {
                name: 'ListriQu',
                url: 'https://backoffice-listriqu.air.id/login.php',
            },
            { name: 'ITSM', url: 'http://10.1.86.28/HEAT' },
        ],
    },
];
