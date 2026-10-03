import { Head, router, usePage } from '@inertiajs/react';
import {
    BellRing,
    CalendarDays,
    ChevronDown,
    Clock3,
    Pencil,
    Plus,
    Search,
    Trash2,
    TimerReset,
    Users,
    WalletCards,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import FlashMessage from '@/components/common/flash-message';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';

/**
 * Permission Release Schedule.
 *
 * Halaman index bersifat publik (guest/user/admin),
 * tetapi aksi tulis hanya untuk admin. Pola ini sama
 * dengan menu Info (auth.info.create/update/delete).
 */
const PERMISSION_CREATE = 'auth.release-schedule.create';
const PERMISSION_UPDATE = 'auth.release-schedule.update';
const PERMISSION_DELETE = 'auth.release-schedule.delete';

type ReleaseType = 'meal' | 'meal_dzuhur' | 'toilet';

type SessionInfo = {
    id: number;
    actual_start: string | null;
    actual_end: string | null;
    duration_used_seconds: number;
    status: string;
    allowed_duration_seconds: number;
    remaining_seconds: number;
};

type ScheduleItem = {
    id: number;
    type: ReleaseType | string;
    scheduled_start: string | null;
    scheduled_end: string | null;
    duration_minutes: number;
    is_flexible: boolean;
    tolerance_minutes: number;

    used_minutes?: number;
    actual_start?: string | null;
    actual_end?: string | null;
    status?: string;
    session_status?: string | null;
    monitor_status?: string | null;

    /** Data ReleaseSession dari formatter yang sama dengan Monitor. */
    session?: SessionInfo | null;
};

type AuxiliaryData = {
    toilet_minutes: number;
    makan_minutes: number;
    sholat_minutes: number;
    total_aux_minutes: number;
    sisa_aux_minutes: number;
    quota_minutes: number;
};

type ScheduleGroup = {
    agent_name: string;
    shift: string;
    date: string;

    total_minutes: number;
    used_minutes?: number;
    remaining_minutes?: number;
    carry_over_minutes?: number;
    allocated_minutes?: number;

    schedule_allocated_minutes?: number;
    schedule_used_minutes?: number;
    schedule_remaining_minutes?: number;

    auxiliary?: AuxiliaryData | null;

    release_count: number;
    schedules: ScheduleItem[];
};

type Filters = {
    date: string;
    shift: string | null;
    search: string;
};

type Props = {
    groups: ScheduleGroup[];
    filters: Filters;
};

type ReleaseStatus =
    | 'upcoming'
    | 'releasing'
    | 'tolerance'
    | 'missed'
    | 'released'
    | 'overtime';

type AlertItem = {
    key: string;
    level: 'warning' | 'danger';
    message: string;
};

const SHIFTS = ['X', 'A', 'B', 'E', 'F', 'H', 'J', 'P', 'R'];

/**
 * ============================================================
 * FILTER SHIFT (MULTI-SELECT)
 * ============================================================
 *
 * CATATAN PENTING:
 * Backend ReleaseScheduleController hanya mendukung SATU nilai
 * (`where('shift', $shift)`), sehingga mengirim `shift=X,H`
 * menghasilkan 0 baris (dibaca sebagai satu nilai harfiah).
 *
 * Karena itu parameter `shift` TIDAK PERNAH dikirim ke server;
 * server selalu mengembalikan seluruh shift pada tanggal
 * terpilih, lalu multi-select disaring di client oleh
 * `visibleGroups`.
 */

/**
 * Normalisasi nilai shift untuk perbandingan (bukan mengubah data).
 * Menjaga perbandingan tetap benar walau ada spasi/beda kapital.
 */
const normalizeShift = (value: unknown): string =>
    String(value ?? '')
        .trim()
        .toUpperCase();

/** Label dropdown Shift: Semua / Shift F / 3 Shift Dipilih. */
const shiftFilterLabel = (shifts: string[]): string => {
    if (shifts.length === 0) {
        return 'Semua Shift';
    }

    if (shifts.length === 1) {
        return `Shift ${shifts[0]}`;
    }

    return `${shifts.length} Shift Dipilih`;
};

/**
 * =========================================================
 * TIME
 * =========================================================
 */
const formatTime = (time: string | null) => {
    if (!time) {
        return '-';
    }

    return time.substring(0, 5);
};

/**
 * =========================================================
 * RELEASE TYPE
 * =========================================================
 */
const getReleaseTypeLabel = (type: ReleaseType | string) => {
    switch (type) {
        case 'meal':
            return 'Makan';

        case 'meal_dzuhur':
            return 'Sholat';

        case 'toilet':
            return 'Toilet';

        default:
            return type;
    }
};

/**
 * =========================================================
 * INITIAL
 * =========================================================
 */
const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);

    if (parts.length === 0) {
        return 'CS';
    }

    if (parts.length === 1) {
        return parts[0].substring(0, 2).toUpperCase();
    }

    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
};

/**
 * Menghitung tanggal efektif kalender untuk slot release
 * sesuai aturan shift J/P/R:
 * - Shift J: jam < 12:00 -> Work Date + 1; jam >= 12:00 -> Work Date
 * - Shift P: jam < 12:00 (00:00-08:00) -> Work Date + 1; 22:00-23:59 -> Work Date
 * - Shift R: SEMUA jadwal -> Work Date + 1
 * - Shift lain: Work Date
 */
const getEffectiveDateString = (
    workDate: string,
    timeStr: string | null | undefined,
    shift?: string,
): string => {
    if (!timeStr || !workDate) {
        return workDate ?? '';
    }

    const [hours] = timeStr.split(':').map(Number);
    let addDay = false;

    if (shift === 'R') {
        addDay = true;
    } else if (shift === 'P' && hours < 12) {
        addDay = true;
    } else if (shift === 'J' && hours < 12) {
        addDay = true;
    }

    if (!addDay) {
        return workDate.substring(0, 10);
    }

    const [y, m, d] = workDate.substring(0, 10).split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + 1);

    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(
        2,
        '0',
    )}-${String(dt.getDate()).padStart(2, '0')}`;
};

/**
 * =========================================================
 * TIME HELPER
 * =========================================================
 */
const timeToMinutes = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);

    return hours * 60 + minutes;
};

/**
 * =========================================================
 * CURRENT DATE
 * =========================================================
 */
const getCurrentDateString = () => {
    const today = new Date();

    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(
        2,
        '0',
    )}-${String(today.getDate()).padStart(2, '0')}`;
};

/**
 * =========================================================
 * STATUS
 * =========================================================
 */
const getStatus = (
    schedule: ScheduleItem,
    selectedDate: string,
    shift?: string,
    /*
     * "Sekarang" dalam menit (0-1439), atau null bila belum
     * mounted / saat SSR. Bila null, bagian status yang
     * bergantung jam tidak dihitung agar hasil render server
     * dan client identik (mencegah hydration mismatch).
     * Status aktual dari monitor_status (backend) tetap dipakai.
     */
    nowMinutes: number | null = null,
): ReleaseStatus => {
    /**
     * =========================================================
     * STATUS AKTUAL DARI BACKEND
     * =========================================================
     *
     * monitor_status berasal dari ReleaseSession
     * (data aktual ReleaseMonitor), bukan hitungan
     * jam jadwal.
     *
     * Prioritaskan status ini di atas segalanya.
     */
    const monitorStatus = (
        schedule.monitor_status ??
        schedule.status ??
        ''
    ).toLowerCase();

    if (monitorStatus === 'releasing' || monitorStatus === 'active') {
        return 'releasing';
    }

    if (monitorStatus === 'overtime') {
        return 'overtime';
    }

    if (monitorStatus === 'released') {
        return 'released';
    }

    if (monitorStatus === 'missed') {
        return 'missed';
    }

    if (monitorStatus === 'tolerance' || monitorStatus === 'waiting') {
        return 'tolerance';
    }

    if (monitorStatus === 'upcoming') {
        return 'upcoming';
    }

    /**
     * Release flexible tidak mempunyai
     * waktu tetap.
     */
    if (
        schedule.is_flexible ||
        !schedule.scheduled_start ||
        !schedule.scheduled_end
    ) {
        return 'upcoming';
    }

    /**
     * Status berdasarkan jam hanya berlaku
     * untuk tanggal hari ini.
     */
    /*
     * Bila belum mounted (SSR / render awal), status berbasis jam
     * belum boleh dihitung -> kembalikan 'upcoming' yang stabil.
     */
    if (nowMinutes === null) {
        return 'upcoming';
    }

    const currentDate = getCurrentDateString();

    if (selectedDate !== currentDate) {
        return 'upcoming';
    }

    const now = nowMinutes;

    const isOvernight =
        shift === 'R' ||
        (['J', 'P'].includes(shift ?? '') &&
            schedule.scheduled_start &&
            parseInt(schedule.scheduled_start.substring(0, 2), 10) < 12);

    /**
     * Pada jam malam work date, slot dini hari besok berstatus upcoming
     */
    if (isOvernight && now >= 12 * 60) {
        return 'upcoming';
    }

    const start = timeToMinutes(schedule.scheduled_start);

    const end = timeToMinutes(schedule.scheduled_end);

    const tolerance = schedule.tolerance_minutes ?? 5;

    /**
     * Belum waktunya.
     */
    if (now < start) {
        return 'upcoming';
    }

    /**
     * =========================================================
     * SUDAH MASUK JAM RELEASE
     * =========================================================
     *
     * TIDAK BOLEH memalsukan 'releasing' dari jam saja.
     * Cyan (releasing) hanya boleh datang dari
     * monitor_status ReleaseSession (backend Finesse).
     *
     * Masuk jam + belum ada session:
     * - sebelum toleransi berakhir -> tolerance (BELUM RELEASE)
     * - lewat toleransi            -> missed
     */
    const toleranceEnd = end + tolerance;

    if (now < toleranceEnd) {
        return 'tolerance';
    }

    /**
     * Sudah melewati release.
     */
    return 'missed';
};

/**
 * =========================================================
 * STATUS LABEL
 * =========================================================
 */
const getStatusLabel = (
    status: ReleaseStatus,
    type?: string,
    sessionStatus?: string | null,
) => {
    /**
     * RELEASE MAKAN ACTIVE -> tetap cyan,
     * hanya labelnya yang lebih spesifik.
     */
    const isMealType = type === 'meal' || type === 'meal_dzuhur';

    switch (status) {
        case 'upcoming':
            return 'Akan Release';

        case 'releasing':
            return isMealType ? 'Sedang Release Makan' : 'Sedang Release';

        case 'overtime':
            return 'Overtime';

        case 'tolerance':
            /**
             * Masuk jam release tapi belum ada
             * ReleaseSession -> indikator BELUM RELEASE.
             */
            return sessionStatus ? 'Toleransi' : 'Belum Release';

        case 'missed':
            return 'Tidak Release';

        case 'released':
            return 'Sudah Release';

        default:
            return '-';
    }
};

/**
 * =========================================================
 * STATUS STYLE
 * =========================================================
 */
const getStatusClasses = (status: ReleaseStatus) => {
    switch (status) {
        case 'upcoming':
            return {
                dot: 'bg-slate-300',
                badge: 'border-slate-200 bg-slate-50 text-slate-600',
                row: 'border-slate-200 bg-white',
            };

        case 'releasing':
            return {
                dot: 'bg-cyan-500',
                badge: 'border-cyan-200 bg-cyan-50 text-cyan-700',
                row: 'border-cyan-200 bg-cyan-50/40',
            };

        case 'overtime':
            return {
                dot: 'bg-purple-500',
                badge: 'border-purple-200 bg-purple-50 text-purple-700',
                row: 'border-purple-200 bg-purple-50/40',
            };

        case 'tolerance':
            return {
                dot: 'bg-orange-500',
                badge: 'border-orange-200 bg-orange-50 text-orange-700',
                row: 'border-orange-200 bg-orange-50/40',
            };

        case 'missed':
            return {
                dot: 'bg-red-500',
                badge: 'border-red-200 bg-red-50 text-red-700',
                row: 'border-red-200 bg-red-50/40',
            };

        case 'released':
            return {
                dot: 'bg-green-500',
                badge: 'border-green-200 bg-green-50 text-green-700',
                row: 'border-green-200 bg-green-50/40',
            };

        default:
            return {
                dot: 'bg-slate-300',
                badge: 'border-slate-200 bg-slate-50 text-slate-600',
                row: 'border-slate-200 bg-white',
            };
    }
};

/**
 * =========================================================
 * NUMBER HELPER
 * =========================================================
 */
const safeNumber = (value: number | null | undefined) => {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
        return 0;
    }

    return Number(value);
};

/**
 * =========================================================
 * AUDIO ALARM
 * =========================================================
 *
 * Satu AudioContext dibagi global.
 * Browser memblokir audio sebelum interaksi user
 * (autoplay policy), jadi context di-resume pada
 * interaksi pertama. Tidak ada infinite loop audio:
 * alarm hanya beep singkat 2x per event baru.
 */
let audioCtx: AudioContext | null = null;

const ensureAudioContext = (): AudioContext | null => {
    if (!audioCtx) {
        const Ctx =
            window.AudioContext ??
            (
                window as unknown as {
                    webkitAudioContext?: typeof AudioContext;
                }
            ).webkitAudioContext;

        if (!Ctx) {
            return null;
        }

        try {
            audioCtx = new Ctx();
        } catch {
            return null;
        }
    }

    if (audioCtx.state === 'suspended') {
        void audioCtx.resume();
    }

    return audioCtx;
};

const playBeep = () => {
    const ctx = ensureAudioContext();

    if (!ctx || ctx.state !== 'running') {
        return;
    }

    try {
        /*
         * Pola alarm lebih panjang:
         * 3 beep x 0.6 detik, jeda 0.2 detik
         * (total bunyi ~2.2 detik per event).
         */
        const beepCount = 3;
        const beepDuration = 0.6;
        const beepGap = 0.2;

        for (let i = 0; i < beepCount; i += 1) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(ctx.destination);

            const startAt = ctx.currentTime + i * (beepDuration + beepGap);

            osc.frequency.value = 880;

            /*
             * Fade in/out singkat supaya transisi
             * tidak menghasilkan bunyi "klik".
             */
            gain.gain.setValueAtTime(0.0001, startAt);
            gain.gain.exponentialRampToValueAtTime(0.1, startAt + 0.05);
            gain.gain.setValueAtTime(0.1, startAt + beepDuration - 0.05);
            gain.gain.exponentialRampToValueAtTime(
                0.0001,
                startAt + beepDuration,
            );

            osc.start(startAt);
            osc.stop(startAt + beepDuration);
        }
    } catch {
        // Audio tidak didukung browser.
    }
};

/**
 * =========================================================
 * COMPONENT
 * =========================================================
 */
export default function ScheduleIndex({ groups, filters }: Props) {
    /**
     * Permission user yang sedang login (dibagikan global
     * oleh HandleInertiaRequests, sama seperti menu Info).
     *
     * Guest tidak memiliki permission apa pun sehingga
     * tombol tulis otomatis tersembunyi.
     */
    const { props } = usePage();
    const authProps = props as {
        auth?: { permissions?: string[] };
    };
    const permissions = authProps.auth?.permissions ?? [];
    const canCreate = permissions.includes(PERMISSION_CREATE);
    const canUpdate = permissions.includes(PERMISSION_UPDATE);
    const canDelete = permissions.includes(PERMISSION_DELETE);

    const canManage = canUpdate || canDelete;

    /**
     * Dialog konfirmasi hapus (Shadcn).
     *
     * Menggantikan window.confirm agar UI konsisten
     * dengan popup Password.
     */
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    const [date, setDate] = useState(filters.date);

    /**
     * Filter Shift (multi-select).
     *
     * []          -> Semua Shift
     * ['F']       -> hanya Shift F
     * ['F','H']   -> Shift F dan H
     *
     * Nilai awal diturunkan dari query parameter `shift`
     * (format lama `shift=F` tetap terbaca).
     */
    const [selectedShifts, setSelectedShifts] = useState<string[]>(() =>
        (filters.shift ?? '')
            .split(',')
            .map((item) => item.trim().toUpperCase())
            .filter(Boolean),
    );

    /** Dropdown multi-select Shift (Popover) open state. */
    const [shiftDropdownOpen, setShiftDropdownOpen] = useState(false);

    /**
     * Search input lokal.
     *
     * Tidak langsung melakukan request.
     * User dapat mengetik tanpa halaman reload.
     */
    const [search, setSearch] = useState(filters.search ?? '');

    /**
     Tanggal
     */

    const dateInputRef = useRef<HTMLInputElement>(null);
    /**
     * Search yang benar-benar sudah dikirim.
     */
    const [submittedSearch, setSubmittedSearch] = useState(
        filters.search ?? '',
    );

    /**
     * Realtime clock.
     */
    const [currentTime, setCurrentTime] = useState(new Date());

    /**
     * Mounted flag.
     *
     * Hydration: nilai waktu (jam/tanggal) hanya boleh dirender
     * setelah React mounted di browser. Sebelum mounted, jam
     * dirender dengan placeholder statis yang identik antara
     * server & client sehingga tidak terjadi hydration mismatch.
     */
    const [mounted, setMounted] = useState(false);

    /**
     * =====================================================
     * REALTIME CLOCK
     * =====================================================
     */
    useEffect(() => {
        /*
         * Tandai mounted setelah render pertama selesai.
         * Dipanggil di dalam callback (rAF), bukan langsung di
         * badan effect, agar tidak memicu cascading render dan
         * tetap aman terhadap hydration.
         */
        const raf = window.requestAnimationFrame(() => {
            setMounted(true);
            setCurrentTime(new Date());
        });

        const timer = window.setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => {
            window.cancelAnimationFrame(raf);
            window.clearInterval(timer);
        };
    }, []);

    /**
     * =====================================================
     * AUTO REFRESH DATA
     * =====================================================
     *
     * Status aktual (monitor_status) dihitung backend
     * dari data Finesse yang di-sync oleh ReleaseMonitor.
     *
     * Tanpa refresh ini, halaman menampilkan data lama
     * dan tidak sinkron dengan ReleaseMonitor.
     */
    useEffect(() => {
        const timer = window.setInterval(() => {
            router.reload({ only: ['groups'] });
        }, 10000);

        return () => {
            window.clearInterval(timer);
        };
    }, []);

    /**
     * =====================================================
     * DATA AUXILIARY (SUMBER: BACKEND)
     * =====================================================
     *
     * Schedule Index TIDAK memanggil Finesse secara langsung.
     * Data Auxiliary dibaca dari backend (group.auxiliary),
     * yang di-sync lewat alur:
     *
     *   Finesse -> ReleaseMonitor -> POST /release-session/sync
     *     -> release_sessions (DB) -> backend -> schedule-index
     *
     * Polling Inertia (router.reload groups, 10 detik) di atas
     * sudah mengambil data terbaru, sehingga tidak diperlukan
     * fetch langsung ke /api/finesse/combined.
     */

    /**
     * =====================================================
     * SYNC SEARCH DARI BACKEND
     * =====================================================
     *
     * Derived-state pattern (React docs: You Might Not Need
     * an Effect): simpan prevFilters.search di state, lalu
     * reset state pencarian saat backend mengirim nilai baru.
     */
    const [prevBackendSearch, setPrevBackendSearch] = useState(
        filters.search ?? '',
    );

    const backendSearch = filters.search ?? '';

    if (prevBackendSearch !== backendSearch) {
        setPrevBackendSearch(backendSearch);
        setSearch(backendSearch);
        setSubmittedSearch(backendSearch);
    }

    /**
     * =====================================================
     * FILTER SHIFT (CLIENT-SIDE)
     * =====================================================
     *
     * Backend hanya mendukung satu nilai `shift`, sedangkan
     * filter ini multi-select. Maka data diambil TANPA filter
     * shift dari server, lalu shift dipilih di sisi client
     * dengan anggota `selectedShifts`.
     *
     * Catatan: filter ini hanya diterapkan ketika TIDAK
     * memilih semua shift yang tersedia, sehingga tampilan
     * bawaan (Semua Shift) tetap identik dengan sebelumnya.
     */
    const visibleGroups = useMemo(() => {
        if (selectedShifts.length === 0) {
            return groups;
        }

        const availableShifts = Array.from(
            new Set(groups.map((group) => normalizeShift(group.shift))),
        );

        const selectsAllAvailable =
            availableShifts.length > 0 &&
            availableShifts.every((item) => selectedShifts.includes(item));

        if (selectsAllAvailable) {
            return groups;
        }

        return groups.filter((group) =>
            selectedShifts.includes(normalizeShift(group.shift)),
        );
    }, [groups, selectedShifts]);

    /**
     * =====================================================
     * SEARCH
     *
     * SEARCH TIDAK AUTO REFRESH.
     *
     * User mengetik bebas.
     * Tekan ENTER untuk menjalankan pencarian.
     * =====================================================
     */
    const handleSearchKeyDown = (
        event: React.KeyboardEvent<HTMLInputElement>,
    ) => {
        if (event.key !== 'Enter') {
            return;
        }

        event.preventDefault();

        const value = search.trim();

        setSubmittedSearch(value);

        router.get(
            '/release-schedule',
            {
                date,
                search: value || undefined,
            },
            {
                preserveScroll: true,
                replace: true,
                only: ['groups', 'filters'],
            },
        );
    };

    /**
     * =====================================================
     * DATE FILTER
     * =====================================================
     */
    const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;

        setDate(value);

        router.get(
            '/release-schedule',
            {
                date: value,
                search: submittedSearch || undefined,
            },
            {
                preserveScroll: true,
                replace: true,
                only: ['groups', 'filters'],
            },
        );
    };

    /**
     * =====================================================
     * SHIFT FILTER (MULTI-SELECT)
     * =====================================================
     *
     * Checkbox Shift adalah FILTER FRONTEND.
     *
     * Handler ini HANYA mengubah local state; TIDAK ada
     * router.get/visit/reload, sehingga dropdown tetap
     * terbuka dan user bisa mencentang beberapa shift
     * berturut-turut tanpa navigasi halaman.
     *
     * Backend tetap dipakai untuk date & search saja
     * (`groups` sudah berisi DATA LENGKAP untuk tanggal
     * terpilih), lalu multi-shift disaring di client oleh
     * `visibleGroups`.
     */
    const handleShiftToggle = (value: string) => {
        const target = normalizeShift(value);

        setSelectedShifts((current) => {
            const exists = current.includes(target);

            const next = exists
                ? current.filter((item) => item !== target)
                : [...current, target];

            /* Urutkan mengikuti urutan SHIFTS agar stabil. */
            return SHIFTS.filter((item) => next.includes(item));
        });
    };

    /** Reset filter Shift ke "Semua Shift" (tanpa pilihan). */
    const handleShiftReset = () => {
        setSelectedShifts([]);
    };

    /**
     * =====================================================
     * CREATE
     * =====================================================
     */
    const handleCreate = () => {
        router.visit('/release-schedule/create');
    };

    /**
     * =====================================================
     * EDIT
     * =====================================================
     */
    const handleEdit = (id: number | undefined) => {
        if (!id) {
            return;
        }

        router.visit(`/release-schedule/${id}/edit`);
    };

    /**
     * =====================================================
     * DELETE
     * =====================================================
     */
    const handleDelete = (id: number | undefined) => {
        if (!id) {
            return;
        }

        setDeleteId(id);
        setDeleteDialogOpen(true);
    };

    /**
     * Konfirmasi hapus dari Dialog.
     *
     * Menjalankan DELETE yang sama seperti sebelumnya.
     */
    const confirmDelete = () => {
        const id = deleteId;

        if (!id) {
            return;
        }

        router.delete(`/release-schedule/${id}`, {
            preserveScroll: true,
            onError: (errors) => {
                const message =
                    errors?.error ||
                    errors?.message ||
                    Object.values(errors)[0] ||
                    'Slot release yang sudah memiliki histori tidak dapat dihapus.';
                toast.error(message, {
                    position: 'top-right',
                    closeButton: true,
                    dismissible: true,
                });
            },
            onFinish: () => {
                setDeleteDialogOpen(false);
                setDeleteId(null);
            },
        });
    };

    /**
     * =====================================================
     * TOTAL CSO
     *
     * Hanya informasi jumlah CSO.
     * Tidak ada total menit global.
     * =====================================================
     */
    const totalCso = visibleGroups.length;

    /**
     * =====================================================
     * SCHEDULED SHIFTS
     * =====================================================
     *
     * Mengikuti filter shift yang sedang aktif
     * (visibleGroups), BUKAN seluruh groups.
     */
    const scheduledShifts = useMemo(() => {
        const unique = Array.from(
            new Set(visibleGroups.map((group) => normalizeShift(group.shift))),
        );

        return unique.sort((a, b) => {
            const indexA = SHIFTS.indexOf(a);
            const indexB = SHIFTS.indexOf(b);

            return (
                (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB)
            );
        });
    }, [visibleGroups]);

    /**
     * =====================================================
     * CURRENT TIME
     * =====================================================
     */
    /*
     * Sebelum mounted, tampilkan nilai statis yang sama di server
     * dan client untuk mencegah hydration mismatch. Setelah mounted,
     * baru tampilkan jam/tanggal browser.
     */
    const formattedCurrentTime = mounted
        ? currentTime.toLocaleTimeString('id-ID', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false,
          })
        : '--:--:--';

    const currentDateLabel = mounted
        ? currentTime.toLocaleDateString('id-ID', {
              weekday: 'long',
              day: '2-digit',
              month: 'long',
              year: 'numeric',
          })
        : '';

    /**
     * =====================================================
     * ALERT RELEASE
     * =====================================================
     *
     * 1. Waktu release tiba tapi belum diambil
     *    -> warning (tolerance)
     * 2. Melewati masa toleransi, masih belum release
     *    -> danger (missed)
     *
     * Status ini dari backend (monitor_status)
     * yang dihitung berdasarkan data aktual Finesse.
     */
    const notifiedRef = useRef<Set<string>>(new Set());

    const alerts = useMemo(() => {
        const result: AlertItem[] = [];

        /*
         * Belum mounted (SSR / render awal): jangan hitung alert
         * berbasis waktu, agar render server & client identik.
         * Setelah mounted, alert dihitung normal (alarm tetap jalan).
         */
        if (!mounted) {
            return result;
        }

        const today = getCurrentDateString();

        const now = currentTime.getHours() * 60 + currentTime.getMinutes();

        groups.forEach((group) => {
            group.schedules.forEach((schedule) => {
                if (schedule.is_flexible || !schedule.scheduled_start) {
                    return;
                }

                const effectiveDate = getEffectiveDateString(
                    group.date,
                    schedule.scheduled_start,
                    group.shift,
                );

                if (effectiveDate !== today) {
                    return;
                }

                const monitor = (
                    schedule.monitor_status ??
                    schedule.status ??
                    ''
                ).toLowerCase();

                const sessionStatus = schedule.session_status ?? null;

                /**
                 * Akan release / sedang release / sudah release / overtime:
                 * tidak perlu alarm missed.
                 * Status alarm mengikuti status backend.
                 */
                if (
                    monitor === 'upcoming' ||
                    monitor === 'releasing' ||
                    monitor === 'released' ||
                    monitor === 'overtime'
                ) {
                    return;
                }

                const start = timeToMinutes(schedule.scheduled_start);

                /**
                 * Belum masuk jam release.
                 */
                if (now < start) {
                    return;
                }

                const key = `${group.agent_name}-${schedule.id}`;

                /**
                 * =================================================
                 * BELUM RELEASE
                 * =================================================
                 *
                 * Jam release sudah tiba tapi belum ada
                 * ReleaseSession (termasuk kasus CSO masih
                 * melayani Voice/Digital atau NOT READY).
                 */
                /**
                 * =================================================
                 * LEVEL ALARM MENGIKUTI BACKEND
                 * =================================================
                 *
                 * Jika monitor_status backend sudah menyatakan
                 * tolerance/waiting (misal CSO masih Voice/Digital),
                 * alarm TETAP warning â€” tidak pernah danger/missed
                 * hanya karena jam frontend melewati toleransi.
                 * Missed (danger) hanya bila backend menyatakan missed.
                 */
                const backendWaiting =
                    monitor === 'tolerance' || monitor === 'waiting';

                if (!sessionStatus || sessionStatus === 'missed') {
                    if (backendWaiting) {
                        result.push({
                            key,
                            level: 'warning',
                            message: `Release ${formatTime(
                                schedule.scheduled_start,
                            )} - ${group.agent_name} MENUNGGU RELEASE (masih menangani customer)`,
                        });

                        return;
                    }

                    const tolerance = schedule.tolerance_minutes ?? 5;

                    const scheduledEnd = schedule.scheduled_end
                        ? timeToMinutes(schedule.scheduled_end)
                        : start + schedule.duration_minutes;

                    const toleranceEnd = scheduledEnd + tolerance;

                    if (now >= toleranceEnd && !sessionStatus) {
                        result.push({
                            key: `${key}-missed`,
                            level: 'danger',
                            message: `Release ${formatTime(
                                schedule.scheduled_start,
                            )} - ${group.agent_name} TIDAK RELEASE, melewati masa toleransi`,
                        });
                    } else {
                        result.push({
                            key:
                                sessionStatus === 'missed'
                                    ? `${key}-missed`
                                    : key,
                            level:
                                sessionStatus === 'missed'
                                    ? 'danger'
                                    : 'warning',
                            message:
                                sessionStatus === 'missed'
                                    ? `Release ${formatTime(
                                          schedule.scheduled_start,
                                      )} - ${group.agent_name} TIDAK RELEASE`
                                    : `Waktu release ${formatTime(
                                          schedule.scheduled_start,
                                      )} tiba - ${group.agent_name} BELUM RELEASE (masih menangani customer / belum eligible)`,
                        });
                    }
                }
            });
        });

        return result;
    }, [groups, currentTime, mounted]);

    /**
     * =====================================================
     * AUDIO UNLOCK
     * =====================================================
     *
     * Autoplay policy browser: AudioContext hanya boleh
     * berbunyi setelah interaksi user. Di-resume pada
     * interaksi pertama (sekali saja).
     */
    useEffect(() => {
        const unlock = () => {
            const ctx = ensureAudioContext();

            /*
             * Setelah audio ter-unlock, paksa re-render
             * agar alarm yang tertunda langsung diputar.
             */
            if (ctx && ctx.state === 'running') {
                setCurrentTime(new Date());
            }
        };

        window.addEventListener('pointerdown', unlock, { once: true });

        window.addEventListener('keydown', unlock, { once: true });

        return () => {
            window.removeEventListener('pointerdown', unlock);
            window.removeEventListener('keydown', unlock);
        };
    }, []);

    /**
     * Suara peringatan sekali per alert baru.
     *
     * - Tidak perlu refresh halaman: alerts diperbarui
     *   otomatis oleh polling router.reload (10 detik)
     *   dan jam realtime (tiap detik).
     * - Jika AudioContext belum ter-unlock (autoplay
     *   policy), event TIDAK ditandai sebagai notified
     *   sehingga beep otomatis di-retry pada tick
     *   berikutnya sampai audio benar-benar bunyi.
     * - Tidak ada infinite loop: hanya diputar sekali
     *   per event setelah bunyi pertama berhasil.
     */
    useEffect(() => {
        if (alerts.length === 0) {
            return;
        }

        const ctx = ensureAudioContext();

        const audioReady = ctx !== null && ctx.state === 'running';

        let shouldPlay = false;

        alerts.forEach((alert) => {
            if (!notifiedRef.current.has(alert.key)) {
                if (audioReady) {
                    notifiedRef.current.add(alert.key);
                }

                shouldPlay = true;
            }
        });

        if (!shouldPlay || !audioReady) {
            return;
        }

        playBeep();
    }, [alerts]);

    /**
     * =====================================================
     * RENDER
     * =====================================================
     */
    return (
        <>
            <Head title="Release Schedule" />
            <FlashMessage />

            {/* =====================================================
                DIALOG KONFIRMASI HAPUS (Shadcn)
            ====================================================== */}
            <Dialog
                open={deleteDialogOpen}
                onOpenChange={(open) => {
                    setDeleteDialogOpen(open);

                    if (!open) {
                        setDeleteId(null);
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Hapus Jadwal Release</DialogTitle>

                        <DialogDescription>
                            Hapus seluruh jadwal release CSO pada tanggal dan
                            shift tersebut? Tindakan ini tidak dapat dibatalkan.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                setDeleteDialogOpen(false);
                                setDeleteId(null);
                            }}
                            className="inline-flex h-10 items-center rounded-xl border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                            Batal
                        </button>

                        <button
                            type="button"
                            onClick={confirmDelete}
                            className="inline-flex h-10 items-center rounded-xl bg-red-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
                        >
                            Hapus
                        </button>
                    </div>
                </DialogContent>
            </Dialog>

            <div className="min-h-screen bg-slate-50">
                {/* =====================================================
                    HEADER
                ====================================================== */}
                <div className="border-b border-slate-200 bg-white">
                    <div className="mx-auto max-w-[1600px] px-6 py-5">
                        <div className="flex items-center justify-between gap-6">
                            {/* TITLE */}
                            <div>
                                <h1 className="text-2xl font-semibold text-slate-900">
                                    Release Schedule
                                </h1>

                                <p className="mt-1 text-sm text-slate-500">
                                    Atur jadwal release makan dan sholat setiap
                                    CSO.
                                </p>
                            </div>

                            {/* RIGHT HEADER */}
                            <div className="flex items-center gap-6">
                                {/* CLOCK */}
                                <div className="hidden text-right sm:block">
                                    <div className="flex items-center justify-end gap-2">
                                        <Clock3 className="h-4 w-4 text-blue-500" />

                                        <span className="font-mono text-lg font-semibold tracking-wide text-slate-800">
                                            {formattedCurrentTime}
                                        </span>
                                    </div>

                                    <p className="mt-0.5 text-[11px] text-slate-400">
                                        {currentDateLabel}
                                    </p>
                                </div>

                                {/* CREATE - hanya admin */}
                                {canCreate && (
                                    <button
                                        type="button"
                                        onClick={handleCreate}
                                        className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                                    >
                                        <Plus className="h-4 w-4" />
                                        Tambah Jadwal
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <main className="mx-auto max-w-[1600px] px-6 py-5">
                    {/* =================================================
                        FILTER
                    ================================================== */}
                    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr_1.25fr]">
                            {/* DATE */}
                            <div>
                                <label className="mb-2 block text-xs font-medium text-slate-600">
                                    Tanggal
                                </label>

                                <div
                                    className="relative cursor-pointer"
                                    onClick={() =>
                                        dateInputRef.current?.showPicker?.()
                                    }
                                >
                                    <CalendarDays className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />

                                    <input
                                        ref={dateInputRef}
                                        type="date"
                                        value={date}
                                        onChange={handleDateChange}
                                        className="h-11 w-full cursor-pointer rounded-xl border border-slate-200 bg-white pr-3 pl-10 text-sm text-slate-700 transition outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                                    />
                                </div>
                            </div>

                            {/* SHIFT */}
                            <div>
                                <label className="mb-2 block text-xs font-medium text-slate-600">
                                    Shift
                                </label>

                                <div className="relative">
                                    <Popover
                                        open={shiftDropdownOpen}
                                        onOpenChange={setShiftDropdownOpen}
                                    >
                                        <PopoverTrigger asChild>
                                            <button
                                                type="button"
                                                className="flex h-11 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 text-left text-sm text-slate-700 transition outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                                            >
                                                <span className="truncate">
                                                    {shiftFilterLabel(
                                                        selectedShifts,
                                                    )}
                                                </span>

                                                <ChevronDown className="ml-2 h-4 w-4 shrink-0 text-slate-400" />
                                            </button>
                                        </PopoverTrigger>

                                        <PopoverContent
                                            align="start"
                                            className="w-[var(--radix-popover-trigger-width)] min-w-44 p-1"
                                        >
                                            <label className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm text-slate-600 transition hover:bg-slate-100">
                                                <Checkbox
                                                    checked={
                                                        selectedShifts.length ===
                                                        0
                                                    }
                                                    onCheckedChange={() =>
                                                        handleShiftReset()
                                                    }
                                                />
                                                <span>Semua Shift</span>
                                            </label>

                                            <div className="my-1 h-px bg-slate-100" />

                                            {SHIFTS.map((item) => (
                                                <label
                                                    key={item}
                                                    className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
                                                >
                                                    <Checkbox
                                                        checked={selectedShifts.includes(
                                                            item,
                                                        )}
                                                        onCheckedChange={() =>
                                                            handleShiftToggle(
                                                                item,
                                                            )
                                                        }
                                                    />
                                                    <span>Shift {item}</span>
                                                </label>
                                            ))}
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>

                            {/* SEARCH */}
                            <div>
                                <label className="mb-2 block text-xs font-medium text-slate-600">
                                    Cari CSO
                                </label>

                                <div className="relative">
                                    <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />

                                    <input
                                        type="text"
                                        value={search}
                                        onChange={(event) =>
                                            setSearch(event.target.value)
                                        }
                                        onKeyDown={handleSearchKeyDown}
                                        placeholder="Ketik nama CSO lalu tekan Enter Sob..."
                                        className="h-11 w-full rounded-xl border border-slate-200 bg-white pr-3 pl-10 text-sm text-slate-700 transition outline-none placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                                    />
                                </div>

                                <p className="mt-1 text-[10px] text-slate-400">
                                    Tekan Enter untuk mencari
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* =================================================
                        SMALL SUMMARY
                    ================================================== */}
                    <section className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                        {/* TOTAL CSO */}
                        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50">
                                    <Users className="h-5 w-5 text-blue-600" />
                                </div>

                                <div>
                                    <p className="text-[11px] font-medium tracking-wide text-slate-500 uppercase">
                                        Total CSO
                                    </p>

                                    <p className="mt-0.5 text-xl font-semibold text-slate-900">
                                        {totalCso}
                                    </p>

                                    <p className="text-[11px] text-slate-400">
                                        CSO dengan jadwal release
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* SHIFT */}
                        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50">
                                    <CalendarDays className="h-5 w-5 text-purple-600" />
                                </div>

                                <div className="min-w-0">
                                    <p className="text-[11px] font-medium tracking-wide text-slate-500 uppercase">
                                        Shift Terjadwal
                                    </p>

                                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                                        {scheduledShifts.length > 0 ? (
                                            scheduledShifts.map((item) => (
                                                <span
                                                    key={item}
                                                    className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700"
                                                >
                                                    {item}
                                                </span>
                                            ))
                                        ) : (
                                            <span className="text-xs text-slate-400">
                                                Tidak ada jadwal
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* =================================================
                        LEGEND
                    ================================================== */}
                    <section className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs shadow-sm">
                        <span className="font-semibold text-slate-700">
                            Status:
                        </span>

                        <div className="flex items-center gap-2 text-slate-500">
                            <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                            Akan Release
                        </div>

                        <div className="flex items-center gap-2 text-cyan-600">
                            <span className="h-2.5 w-2.5 rounded-full bg-cyan-500" />
                            Sedang Release
                        </div>

                        <div className="flex items-center gap-2 text-purple-600">
                            <span className="h-2.5 w-2.5 rounded-full bg-purple-500" />
                            Overtime
                        </div>

                        <div className="flex items-center gap-2 text-green-600">
                            <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
                            Sudah Release
                        </div>

                        <div className="flex items-center gap-2 text-orange-600">
                            <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />
                            Toleransi
                        </div>

                        <div className="flex items-center gap-2 text-red-600">
                            <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                            Tidak Release
                        </div>
                    </section>

                    {/* =================================================
                        ALERT RELEASE
                    ================================================== */}
                    {alerts.length > 0 && (
                        <section className="mt-4 space-y-2">
                            {alerts.map((alert) => (
                                <div
                                    key={alert.key}
                                    className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium shadow-sm ${
                                        alert.level === 'danger'
                                            ? 'animate-pulse border-red-300 bg-red-50 text-red-700'
                                            : 'border-orange-300 bg-orange-50 text-orange-700'
                                    }`}
                                >
                                    <BellRing className="h-4 w-4 shrink-0" />

                                    <span>{alert.message}</span>
                                </div>
                            ))}
                        </section>
                    )}

                    {/* =================================================
                        TABLE
                    ================================================== */}
                    <section className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[1200px]">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50">
                                        <th className="px-5 py-3 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
                                            CSO
                                        </th>

                                        <th className="px-5 py-3 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
                                            Shift
                                        </th>

                                        <th className="px-5 py-3 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
                                            Jadwal Release
                                        </th>

                                        <th className="px-5 py-3 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
                                            Sisa Release
                                        </th>

                                        <th className="px-5 py-3 text-right text-xs font-semibold tracking-wide text-slate-500 uppercase">
                                            Aksi
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {visibleGroups.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={5}
                                                className="px-5 py-16 text-center"
                                            >
                                                <div className="mx-auto flex max-w-sm flex-col items-center">
                                                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                                                        <CalendarDays className="h-5 w-5 text-slate-400" />
                                                    </div>

                                                    <p className="mt-3 text-sm font-semibold text-slate-700">
                                                        Tidak ada jadwal release
                                                    </p>

                                                    <p className="mt-1 text-xs text-slate-400">
                                                        Tidak ditemukan CSO
                                                        dengan jadwal pada
                                                        tanggal atau filter yang
                                                        dipilih.
                                                    </p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        visibleGroups.map((group) => {
                                            const aux = group.auxiliary ?? null;

                                            /*
                                             * =================================================
                                             * SISA RELEASE (SUMBER: AUXILIARY)
                                             * =================================================
                                             *
                                             * Nilai Sisa Release HARUS sama persis dengan
                                             * Sisa Auxiliary di ReleaseMonitor.
                                             *
                                             * Sumber data tunggal:
                                             * - aux.sisa_aux_minutes + aux.quota_minutes
                                             *   (dihitung backend dari dataAuxiliary Cubemap)
                                             *   bila tersedia,
                                             * - fallback: quota_minutes - total_aux_minutes.
                                             *
                                             * TIDAK dihitung ulang dari release_sessions,
                                             * carry-over, schedule, atau durasi jadwal.
                                             */
                                            const quota = aux
                                                ? safeNumber(
                                                      aux.quota_minutes ?? 90,
                                                  )
                                                : 90;

                                            const sisaRelease = aux
                                                ? safeNumber(
                                                      aux.sisa_aux_minutes ??
                                                          Math.max(
                                                              0,
                                                              quota -
                                                                  safeNumber(
                                                                      aux.total_aux_minutes,
                                                                  ),
                                                          ),
                                                  )
                                                : quota;

                                            const carryOver = safeNumber(
                                                group.carry_over_minutes,
                                            );

                                            return (
                                                <tr
                                                    key={`${group.agent_name}-${group.shift}-${group.date}`}
                                                    className="border-b border-slate-100 last:border-b-0"
                                                >
                                                    {/* =================================================
                                                        CSO
                                                    ================================================== */}
                                                    <td className="px-5 py-5 align-top">
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xs font-bold text-blue-600">
                                                                {getInitials(
                                                                    group.agent_name,
                                                                )}
                                                            </div>

                                                            <div>
                                                                <p className="font-semibold text-slate-900">
                                                                    {
                                                                        group.agent_name
                                                                    }
                                                                </p>

                                                                <p className="mt-0.5 text-xs text-slate-400">
                                                                    {
                                                                        group.release_count
                                                                    }{' '}
                                                                    release
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* =================================================
                                                        SHIFT
                                                    ================================================== */}
                                                    <td className="px-5 py-5 align-top">
                                                        <span className="inline-flex rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">
                                                            {group.shift}
                                                        </span>
                                                    </td>

                                                    {/* =================================================
                                                        JADWAL
                                                    ================================================== */}
                                                    <td className="px-5 py-5 align-top">
                                                        <div className="flex flex-wrap gap-2">
                                                            {group.schedules.map(
                                                                (schedule) => {
                                                                    const status =
                                                                        getStatus(
                                                                            schedule,
                                                                            group.date,
                                                                            group.shift,
                                                                            mounted
                                                                                ? currentTime.getHours() *
                                                                                      60 +
                                                                                      currentTime.getMinutes()
                                                                                : null,
                                                                        );

                                                                    const classes =
                                                                        getStatusClasses(
                                                                            status,
                                                                        );

                                                                    return (
                                                                        <div
                                                                            key={
                                                                                schedule.id
                                                                            }
                                                                            className={`min-w-[155px] rounded-xl border p-3 transition ${classes.row}`}
                                                                        >
                                                                            <div className="flex items-center justify-between gap-2">
                                                                                <span className="text-xs font-medium text-slate-500">
                                                                                    {getReleaseTypeLabel(
                                                                                        schedule.type,
                                                                                    )}
                                                                                </span>

                                                                                <span
                                                                                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${classes.dot}`}
                                                                                />
                                                                            </div>

                                                                            <div className="mt-1">
                                                                                <p className="text-sm font-bold text-slate-900">
                                                                                    {schedule.scheduled_start &&
                                                                                    schedule.scheduled_end
                                                                                        ? `${formatTime(
                                                                                              schedule.scheduled_start,
                                                                                          )} - ${formatTime(
                                                                                              schedule.scheduled_end,
                                                                                          )}`
                                                                                        : 'Flexible'}
                                                                                </p>
                                                                            </div>

                                                                            <div className="mt-1 flex items-center justify-between gap-2">
                                                                                <span className="text-[10px] text-slate-400">
                                                                                    {
                                                                                        schedule.duration_minutes
                                                                                    }{' '}
                                                                                    menit
                                                                                </span>

                                                                                <span
                                                                                    className={`rounded-md border px-1.5 py-0.5 text-[9px] font-semibold ${classes.badge}`}
                                                                                >
                                                                                    {getStatusLabel(
                                                                                        status,
                                                                                        schedule.type,
                                                                                        schedule.session_status,
                                                                                    )}
                                                                                </span>
                                                                            </div>

                                                                            {!schedule.is_flexible &&
                                                                                schedule.tolerance_minutes >
                                                                                    0 && (
                                                                                    <p className="mt-1 text-[9px] text-slate-400">
                                                                                        Toleransi{' '}
                                                                                        {
                                                                                            schedule.tolerance_minutes
                                                                                        }{' '}
                                                                                        menit
                                                                                    </p>
                                                                                )}

                                                                            {/*
                                                                                =================================================
                                                                                TIMER RELEASE LIVE
                                                                                =================================================
                                                                                Sumber data sama dengan
                                                                                ReleaseMonitor:
                                                                                actual_start (ISO UTC) +
                                                                                allowed_duration_seconds,
                                                                                dihitung dari tick 1 detik
                                                                                halaman ini.
                                                                            */}
                                                                            {schedule
                                                                                .session
                                                                                ?.actual_start &&
                                                                                (status ===
                                                                                    'releasing' ||
                                                                                    status ===
                                                                                        'overtime') && (
                                                                                    <p className="mt-1 font-mono text-[10px] font-semibold text-cyan-700">
                                                                                        Mulai{' '}
                                                                                        {new Date(
                                                                                            schedule
                                                                                                .session
                                                                                                .actual_start,
                                                                                        ).toLocaleTimeString(
                                                                                            'id-ID',
                                                                                            {
                                                                                                hour: '2-digit',
                                                                                                minute: '2-digit',
                                                                                            },
                                                                                        )}{' '}
                                                                                        •
                                                                                        Sisa{' '}
                                                                                        {(() => {
                                                                                            const allowed =
                                                                                                schedule
                                                                                                    .session
                                                                                                    ?.allowed_duration_seconds ??
                                                                                                0;

                                                                                            const start =
                                                                                                new Date(
                                                                                                    schedule
                                                                                                        .session!
                                                                                                        .actual_start!,
                                                                                                ).getTime();

                                                                                            const elapsedSeconds =
                                                                                                Math.max(
                                                                                                    0,
                                                                                                    Math.floor(
                                                                                                        (currentTime.getTime() -
                                                                                                            start) /
                                                                                                            1000,
                                                                                                    ),
                                                                                                );

                                                                                            const remaining =
                                                                                                Math.max(
                                                                                                    0,
                                                                                                    allowed -
                                                                                                        elapsedSeconds,
                                                                                                );

                                                                                            const h =
                                                                                                Math.floor(
                                                                                                    remaining /
                                                                                                        3600,
                                                                                                );

                                                                                            const m =
                                                                                                Math.floor(
                                                                                                    (remaining %
                                                                                                        3600) /
                                                                                                        60,
                                                                                                );

                                                                                            const s =
                                                                                                remaining %
                                                                                                60;

                                                                                            return `${String(h).padStart(2, '0') !== '00' ? String(h).padStart(2, '0') + ':' : ''}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
                                                                                        })()}
                                                                                    </p>
                                                                                )}
                                                                        </div>
                                                                    );
                                                                },
                                                            )}
                                                        </div>
                                                    </td>

                                                    {/* =================================================
                                                        SISA RELEASE
                                                        (SUMBER: AUXILIARY - sama dengan ReleaseMonitor)
                                                    ================================================== */}
                                                    <td className="px-5 py-5 align-top">
                                                        <div className="min-w-[160px] space-y-2">
                                                            <div className="flex items-center gap-2">
                                                                <TimerReset
                                                                    className={`h-4 w-4 ${
                                                                        sisaRelease ===
                                                                        0
                                                                            ? 'text-red-600'
                                                                            : sisaRelease <=
                                                                                10
                                                                              ? 'text-amber-500'
                                                                              : 'text-emerald-600'
                                                                    }`}
                                                                />

                                                                <span
                                                                    className={`text-base font-bold ${
                                                                        sisaRelease ===
                                                                        0
                                                                            ? 'text-red-700'
                                                                            : sisaRelease <=
                                                                                10
                                                                              ? 'text-amber-600'
                                                                              : 'text-emerald-700'
                                                                    }`}
                                                                >
                                                                    {
                                                                        sisaRelease
                                                                    }{' '}
                                                                    menit
                                                                </span>
                                                            </div>

                                                            <p className="text-[10px] text-slate-400">
                                                                Sisa release CSO
                                                                dari {quota}{' '}
                                                                menit
                                                            </p>

                                                            {/* Breakdown Auxiliary aktual (Toilet, Makan, Sholat) */}
                                                            {aux && (
                                                                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-slate-50 px-2 py-1 text-[10px] text-slate-500">
                                                                    <span>
                                                                        T:{' '}
                                                                        <strong className="font-mono text-slate-700">
                                                                            {
                                                                                aux.toilet_minutes
                                                                            }
                                                                            m
                                                                        </strong>
                                                                    </span>
                                                                    <span className="text-slate-300">
                                                                        •
                                                                    </span>
                                                                    <span>
                                                                        M:{' '}
                                                                        <strong className="font-mono text-slate-700">
                                                                            {
                                                                                aux.makan_minutes
                                                                            }
                                                                            m
                                                                        </strong>
                                                                    </span>
                                                                    <span className="text-slate-300">
                                                                        •
                                                                    </span>
                                                                    <span>
                                                                        S:{' '}
                                                                        <strong className="font-mono text-slate-700">
                                                                            {
                                                                                aux.sholat_minutes
                                                                            }
                                                                            m
                                                                        </strong>
                                                                    </span>
                                                                </div>
                                                            )}

                                                            {carryOver > 0 && (
                                                                <div className="rounded-lg border-orange-100 bg-orange-50 px-2.5 py-2">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <WalletCards className="h-3.5 w-3.5 text-orange-600" />

                                                                        <span className="text-[10px] font-semibold text-orange-600">
                                                                            Carry-over
                                                                        </span>
                                                                    </div>

                                                                    <p className="mt-0.5 text-xs font-bold text-orange-700">
                                                                        +{' '}
                                                                        {
                                                                            carryOver
                                                                        }{' '}
                                                                        menit
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>

                                                    {/* =================================================
                                                        AKSI
                                                    ================================================== */}
                                                    <td className="px-5 py-5 text-right align-top">
                                                        <div className="flex flex-col items-end gap-2">
                                                            {canManage && (
                                                                <>
                                                                    {canUpdate && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() =>
                                                                                handleEdit(
                                                                                    group
                                                                                        .schedules[0]
                                                                                        ?.id,
                                                                                )
                                                                            }
                                                                            className="inline-flex h-9 items-center gap-1.5 rounded-lg border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                                                                        >
                                                                            <Pencil className="h-3.5 w-3.5" />
                                                                            Edit
                                                                        </button>
                                                                    )}

                                                                    {canDelete && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() =>
                                                                                handleDelete(
                                                                                    group
                                                                                        .schedules[0]
                                                                                        ?.id,
                                                                                )
                                                                            }
                                                                            className="inline-flex h-9 items-center gap-1.5 rounded-lg border-red-200 bg-white px-3 text-xs font-medium text-red-600 transition hover:bg-red-50"
                                                                        >
                                                                            <Trash2 className="h-3.5 w-3.5" />
                                                                            Hapus
                                                                        </button>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* =================================================
                            FOOTER
                        ================================================== */}
                        <div className="border-t border-slate-100 px-5 py-3">
                            <div className="flex flex-wrap items-center justify-between gap-4">
                                <p className="text-xs text-slate-400">
                                    Menampilkan{' '}
                                    <b className="font-semibold text-slate-600">
                                        {totalCso}
                                    </b>{' '}
                                    CSO dengan jadwal release.
                                </p>

                                <div className="flex items-center gap-2 text-xs text-slate-400">
                                    <span className="h-2 w-2 rounded-full bg-green-500" />
                                    Monitoring status realtime
                                </div>
                            </div>
                        </div>
                    </section>
                </main>
            </div>
        </>
    );
}
