import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, Clock3, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import FlashMessage from '@/components/common/flash-message';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

type ReleaseType = 'meal' | 'meal_dzuhur' | 'toilet';

type ReleaseRow = {
    id: number;
    type: ReleaseType;
    scheduled_start: string;
    scheduled_end: string;
    duration_minutes: number;
    is_flexible: boolean;
    tolerance_minutes: number;
    has_session?: boolean;
    session_status?: string | null;
};

type ScheduleData = {
    agent_name: string;
    shift: string;
    date: string;
    releases: ReleaseRow[];
};

type Props = {
    schedule: ScheduleData;
};

const SHIFT_OPTIONS = ['X', 'A', 'B', 'C', 'E', 'F', 'H', 'J', 'P', 'R'];

const STANDARD_RELEASE_MINUTES = 75;
const FLEXIBLE_TOILET_MINUTES = 15;

function formatDateForInput(date: string): string {
    if (!date) {
        return '';
    }

    return date.substring(0, 10);
}

function addMinutesToTime(startTime: string, minutes: number): string {
    if (!startTime || !minutes) {
        return '';
    }

    const [hours, mins] = startTime.split(':').map(Number);

    if (Number.isNaN(hours) || Number.isNaN(mins)) {
        return '';
    }

    const totalMinutes = hours * 60 + mins + Number(minutes);

    const normalized = ((totalMinutes % 1440) + 1440) % 1440;

    const resultHours = Math.floor(normalized / 60);

    const resultMinutes = normalized % 60;

    return `${String(resultHours).padStart(2, '0')}:${String(
        resultMinutes,
    ).padStart(2, '0')}`;
}

function getTypeLabel(type: ReleaseType): string {
    switch (type) {
        case 'meal':
            return 'Makan';

        case 'meal_dzuhur':
            return 'Makan / Sholat';

        case 'toilet':
            return 'Toilet';

        default:
            return 'Makan';
    }
}

export default function ScheduleEdit({ schedule }: Props) {
    const [agentName, setAgentName] = useState(schedule.agent_name ?? '');

    const [shift, setShift] = useState(schedule.shift ?? '');

    const [date, setDate] = useState(formatDateForInput(schedule.date));

    const [releases, setReleases] = useState<ReleaseRow[]>(
        schedule.releases?.length
            ? schedule.releases
            : [
                  {
                      id: 0,
                      type: 'meal',
                      scheduled_start: '08:00',
                      scheduled_end: '08:15',
                      duration_minutes: 15,
                      is_flexible: false,
                      tolerance_minutes: 10,
                  },
              ],
    );

    const [processing, setProcessing] = useState(false);

    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    /**
     * Dialog konfirmasi hapus slot (Shadcn).
     *
     * Menggantikan window.confirm agar UI konsisten
     * dengan popup Password.
     */
    const [pendingDeleteIndex, setPendingDeleteIndex] = useState<number | null>(
        null,
    );
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    /*
     * ID release pertama dipakai sebagai
     * parameter route model binding:
     *
     * PUT /release-schedule/{releaseSchedule}
     */
    const firstReleaseId = releases.length > 0 ? releases[0].id : null;

    /*
     * Total seluruh durasi release.
     */
    const fixedMinutes = useMemo(() => {
        return releases.reduce(
            (total, release) =>
                total +
                (release.is_flexible
                    ? 0
                    : Number(release.duration_minutes || 0)),
            0,
        );
    }, [releases]);

    const flexibleMinutes = useMemo(() => {
        return releases.reduce(
            (total, release) =>
                total +
                (release.is_flexible
                    ? Number(release.duration_minutes || 0)
                    : 0),
            0,
        );
    }, [releases]);

    /*
     * Hak release standar yang dijadwalkan pada jam tetap adalah 75 menit.
     * Toilet flexible mempunyai hak terpisah 15 menit.
     */
    const remainingFixedMinutes = Math.max(
        STANDARD_RELEASE_MINUTES - fixedMinutes,
        0,
    );

    const excessFixedMinutes = Math.max(
        fixedMinutes - STANDARD_RELEASE_MINUTES,
        0,
    );

    const flexibleToiletCount = releases.filter(
        (release) => release.is_flexible && release.type === 'toilet',
    ).length;

    /*
     * Update satu field release.
     */
    const updateRelease = (
        index: number,
        field: keyof ReleaseRow,
        value: string | number | boolean,
    ) => {
        setReleases((current) =>
            current.map((release, releaseIndex) => {
                if (releaseIndex !== index) {
                    return release;
                }

                const updated = {
                    ...release,
                    [field]: value,
                };

                /*
                 * Jika jam mulai berubah,
                 * hitung ulang jam selesai
                 * berdasarkan durasi.
                 */
                if (field === 'scheduled_start') {
                    updated.scheduled_end = addMinutesToTime(
                        String(value),
                        Number(release.duration_minutes),
                    );
                }

                /*
                 * Jika durasi berubah,
                 * hitung ulang jam selesai.
                 */
                if (field === 'duration_minutes') {
                    updated.scheduled_end = addMinutesToTime(
                        release.scheduled_start,
                        Number(value),
                    );
                }

                /*
                 * Toilet flexible tidak
                 * membutuhkan jam tetap.
                 */
                if (field === 'is_flexible' && Boolean(value)) {
                    updated.scheduled_start = '';
                    updated.scheduled_end = '';
                    updated.tolerance_minutes = 0;
                    updated.duration_minutes = FLEXIBLE_TOILET_MINUTES;
                }

                /*
                 * Jika flexible dimatikan,
                 * berikan default jam.
                 */
                if (field === 'is_flexible' && !value) {
                    const defaultStart = release.scheduled_start || '08:00';

                    updated.scheduled_start = defaultStart;

                    updated.scheduled_end = addMinutesToTime(
                        defaultStart,
                        Number(release.duration_minutes || 15),
                    );

                    updated.tolerance_minutes = release.tolerance_minutes || 10;
                }

                return updated;
            }),
        );
    };

    /*
     * Tambahkan slot baru.
     */
    const addRelease = () => {
        const previousRelease = releases[releases.length - 1];

        const startTime = previousRelease?.scheduled_end || '08:00';

        const duration = 15;

        const newRelease: ReleaseRow = {
            id: 0,
            type: 'meal',
            scheduled_start: startTime,
            scheduled_end: addMinutesToTime(startTime, duration),
            duration_minutes: duration,
            is_flexible: false,
            tolerance_minutes: 10,
        };

        setReleases((current) => [...current, newRelease]);
    };

    /*
     * Hapus slot.
     */
    /**
     * Buka dialog konfirmasi hapus slot.
     *
     * Mekanisme konfirmasi saja yang berubah
     * (window.confirm -> Shadcn Dialog).
     */
    const removeRelease = (index: number) => {
        if (releases.length <= 1) {
            return;
        }

        const target = releases[index];

        if (!target) {
            return;
        }

        setPendingDeleteIndex(index);
        setDeleteDialogOpen(true);
    };

    /**
     * Konfirmasi hapus dari Dialog.
     *
     * Logic removeRelease tetap sama persis.
     */
    const confirmRemove = () => {
        const index = pendingDeleteIndex;

        if (index === null) {
            setDeleteDialogOpen(false);

            return;
        }

        const target = releases[index];

        if (!target) {
            setDeleteDialogOpen(false);
            setPendingDeleteIndex(null);

            return;
        }

        // Jika slot baru yang belum disimpan ke database
        if (!target.id || target.id <= 0) {
            setReleases((current) =>
                current.filter((_, releaseIndex) => releaseIndex !== index),
            );

            setDeleteDialogOpen(false);
            setPendingDeleteIndex(null);

            return;
        }

        // Jika slot sudah ada di database, kirim request DELETE single slot
        router.delete(`/release-schedule/${target.id}?single=1`, {
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
                setPendingDeleteIndex(null);
            },
        });
    };

    /*
     * Submit update.
     */
    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        setErrorMessage(null);

        if (!firstReleaseId) {
            setErrorMessage('ID jadwal tidak ditemukan.');

            return;
        }

        if (!agentName.trim()) {
            setErrorMessage('Nama CSO wajib diisi.');

            return;
        }

        if (!shift) {
            setErrorMessage('Shift wajib dipilih.');

            return;
        }

        if (!date) {
            setErrorMessage('Tanggal wajib dipilih.');

            return;
        }

        if (releases.length === 0) {
            setErrorMessage('Minimal harus ada satu slot release.');

            return;
        }

        const flexibleReleases = releases.filter(
            (release) => release.is_flexible,
        );

        if (flexibleReleases.length > 1) {
            setErrorMessage(
                'Maksimal hanya satu slot Toilet yang dapat dibuat flexible.',
            );

            return;
        }

        if (flexibleReleases.length === 1) {
            const toilet = flexibleReleases[0];

            if (toilet.type !== 'toilet') {
                setErrorMessage(
                    'Release flexible hanya boleh digunakan untuk Toilet.',
                );

                return;
            }

            if (Number(toilet.duration_minutes) !== FLEXIBLE_TOILET_MINUTES) {
                setErrorMessage(
                    `Durasi Toilet flexible harus ${FLEXIBLE_TOILET_MINUTES} menit.`,
                );

                return;
            }
        }

        const fixedTotal = releases.reduce(
            (total, release) =>
                total +
                (release.is_flexible
                    ? 0
                    : Number(release.duration_minutes || 0)),
            0,
        );

        if (fixedTotal > STANDARD_RELEASE_MINUTES) {
            setErrorMessage(
                `Total release terjadwal tidak boleh lebih dari ${STANDARD_RELEASE_MINUTES} menit. Toilet flexible ${FLEXIBLE_TOILET_MINUTES} menit dihitung terpisah.`,
            );

            return;
        }

        for (let index = 0; index < releases.length; index++) {
            const release = releases[index];

            if (!release.is_flexible && !release.scheduled_start) {
                setErrorMessage(`Jam mulai slot ${index + 1} belum diisi.`);

                return;
            }

            if (!release.is_flexible && !release.scheduled_end) {
                setErrorMessage(`Jam selesai slot ${index + 1} belum diisi.`);

                return;
            }

            if (Number(release.duration_minutes) < 1) {
                setErrorMessage(
                    `Durasi slot ${index + 1} harus lebih dari 0 menit.`,
                );

                return;
            }

            if (Number(release.tolerance_minutes) < 0) {
                setErrorMessage(
                    `Toleransi slot ${index + 1} tidak boleh negatif.`,
                );

                return;
            }

            if (release.is_flexible && release.type !== 'toilet') {
                setErrorMessage(
                    `Slot ${
                        index + 1
                    } yang flexible hanya boleh berupa Toilet.`,
                );

                return;
            }
        }

        setProcessing(true);

        router.put(
            `/release-schedule/${firstReleaseId}`,
            {
                agent_name: agentName.trim(),
                shift,
                date,

                releases: releases.map((release) => ({
                    id: release.id > 0 ? release.id : null,

                    type: release.type,

                    scheduled_start: release.is_flexible
                        ? null
                        : release.scheduled_start,

                    scheduled_end: release.is_flexible
                        ? null
                        : release.scheduled_end,

                    duration_minutes: Number(release.duration_minutes),

                    is_flexible: Boolean(release.is_flexible),

                    tolerance_minutes: release.is_flexible
                        ? 0
                        : Number(release.tolerance_minutes || 0),
                })),
            },
            {
                preserveScroll: true,

                onStart: () => {
                    setProcessing(true);
                },

                onFinish: () => {
                    setProcessing(false);
                },

                onError: (errors) => {
                    const firstError = Object.values(errors)[0];

                    if (typeof firstError === 'string') {
                        setErrorMessage(firstError);
                    } else {
                        setErrorMessage(
                            'Jadwal gagal diperbarui. Periksa kembali data yang diisi.',
                        );
                    }
                },
            },
        );
    };

    /*
     * Jika halaman menerima props baru
     * setelah Inertia navigation,
     * sinkronkan form (state adjustment pattern).
     */
    const [prevSchedule, setPrevSchedule] = useState(schedule);

    if (schedule !== prevSchedule) {
        setPrevSchedule(schedule);
        setAgentName(schedule.agent_name ?? '');
        setShift(schedule.shift ?? '');
        setDate(formatDateForInput(schedule.date));

        if (schedule.releases?.length) {
            setReleases(schedule.releases);
        }
    }

    return (
        <>
            <Head title="Edit Release Schedule" />
            <FlashMessage />

            {/* =====================================================
                DIALOG KONFIRMASI HAPUS SLOT (Shadcn)
            ====================================================== */}
            <Dialog
                open={deleteDialogOpen}
                onOpenChange={(open) => {
                    setDeleteDialogOpen(open);

                    if (!open) {
                        setPendingDeleteIndex(null);
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Hapus Slot Release</DialogTitle>

                        <DialogDescription>
                            Hapus slot release ini? Tindakan ini tidak dapat
                            dibatalkan.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                setDeleteDialogOpen(false);
                                setPendingDeleteIndex(null);
                            }}
                            className="inline-flex h-10 items-center rounded-xl border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                            Batal
                        </button>

                        <button
                            type="button"
                            onClick={confirmRemove}
                            className="inline-flex h-10 items-center rounded-xl bg-red-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
                        >
                            Hapus
                        </button>
                    </div>
                </DialogContent>
            </Dialog>

            <div className="min-h-screen bg-slate-50">
                <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
                    {/* HEADER */}
                    <div className="mb-6 flex items-start gap-4">
                        <Link
                            href="/release-schedule"
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100"
                        >
                            <ArrowLeft size={18} />
                        </Link>

                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">
                                Edit Release Schedule
                            </h1>

                            <p className="mt-1 text-sm text-slate-500">
                                Ubah seluruh jadwal release untuk satu CSO.
                            </p>
                        </div>
                    </div>

                    {/* FORM */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* INFORMASI CSO */}
                        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                            <h2 className="text-sm font-bold tracking-wide text-slate-800 uppercase">
                                Informasi CSO
                            </h2>

                            <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3">
                                {/* NAMA */}
                                <div>
                                    <label
                                        htmlFor="agent_name"
                                        className="mb-2 block text-sm font-semibold text-slate-800"
                                    >
                                        Nama CSO
                                    </label>

                                    <input
                                        id="agent_name"
                                        type="text"
                                        value={agentName}
                                        onChange={(event) =>
                                            setAgentName(event.target.value)
                                        }
                                        placeholder="CC.23.NURHALIZAH"
                                        className="h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-900 transition outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                    />
                                </div>

                                {/* SHIFT */}
                                <div>
                                    <label
                                        htmlFor="shift"
                                        className="mb-2 block text-sm font-semibold text-slate-800"
                                    >
                                        Shift
                                    </label>

                                    <select
                                        id="shift"
                                        value={shift}
                                        onChange={(event) =>
                                            setShift(event.target.value)
                                        }
                                        className="h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-900 transition outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                    >
                                        <option
                                            value=""
                                            className="text-slate-500"
                                        >
                                            Pilih Shift
                                        </option>

                                        {SHIFT_OPTIONS.map((item) => (
                                            <option
                                                key={item}
                                                value={item}
                                                className="text-slate-900"
                                            >
                                                {item}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* TANGGAL */}
                                <div>
                                    <label
                                        htmlFor="date"
                                        className="mb-2 block text-sm font-semibold text-slate-800"
                                    >
                                        Tanggal
                                    </label>

                                    <input
                                        id="date"
                                        type="date"
                                        value={date}
                                        onChange={(event) =>
                                            setDate(event.target.value)
                                        }
                                        className="h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-900 transition outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                    />
                                </div>
                            </div>
                        </section>

                        {/* JADWAL RELEASE */}
                        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <h2 className="text-sm font-bold tracking-wide text-slate-800 uppercase">
                                        Jadwal Release
                                    </h2>

                                    <p className="mt-1 text-sm text-slate-500">
                                        Ubah seluruh slot makan dan toilet.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={addRelease}
                                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700"
                                >
                                    <Plus size={17} />
                                    Tambah Slot
                                </button>
                            </div>

                            {/* SLOT */}
                            <div className="mt-5 space-y-4">
                                {releases.map((release, index) => (
                                    <div
                                        key={`${release.id}-${index}`}
                                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                                    >
                                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_0.9fr_0.9fr_0.8fr_0.8fr_auto]">
                                            {/* JENIS */}
                                            <div>
                                                <label className="mb-2 block text-xs font-semibold text-slate-700">
                                                    Jenis
                                                </label>

                                                <select
                                                    value={release.type}
                                                    onChange={(event) =>
                                                        updateRelease(
                                                            index,
                                                            'type',
                                                            event.target
                                                                .value as ReleaseType,
                                                        )
                                                    }
                                                    className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                                >
                                                    <option value="meal">
                                                        Makan
                                                    </option>

                                                    <option value="meal_dzuhur">
                                                        Makan / Sholat
                                                    </option>

                                                    <option value="toilet">
                                                        Toilet
                                                    </option>
                                                </select>
                                            </div>

                                            {/* MULAI */}
                                            <div>
                                                <label className="mb-2 block text-xs font-semibold text-slate-700">
                                                    Mulai
                                                </label>

                                                <input
                                                    type="time"
                                                    disabled={
                                                        release.is_flexible
                                                    }
                                                    value={
                                                        release.scheduled_start
                                                    }
                                                    onChange={(event) =>
                                                        updateRelease(
                                                            index,
                                                            'scheduled_start',
                                                            event.target.value,
                                                        )
                                                    }
                                                    className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-500"
                                                />
                                            </div>

                                            {/* SELESAI */}
                                            <div>
                                                <label className="mb-2 block text-xs font-semibold text-slate-700">
                                                    Selesai
                                                </label>

                                                <input
                                                    type="time"
                                                    disabled
                                                    value={
                                                        release.scheduled_end
                                                    }
                                                    className="h-11 w-full rounded-xl border border-slate-300 bg-slate-100 px-3 text-sm font-semibold text-slate-800 disabled:text-slate-500"
                                                />
                                            </div>

                                            {/* DURASI */}
                                            <div>
                                                <label className="mb-2 block text-xs font-semibold text-slate-700">
                                                    Durasi (menit)
                                                </label>

                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="120"
                                                    value={
                                                        release.duration_minutes
                                                    }
                                                    onChange={(event) =>
                                                        updateRelease(
                                                            index,
                                                            'duration_minutes',
                                                            Number(
                                                                event.target
                                                                    .value,
                                                            ),
                                                        )
                                                    }
                                                    className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                                />
                                            </div>

                                            {/* TOLERANSI */}
                                            <div>
                                                <label className="mb-2 block text-xs font-semibold text-slate-700">
                                                    Toleransi (menit)
                                                </label>

                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="60"
                                                    value={
                                                        release.tolerance_minutes
                                                    }
                                                    disabled={
                                                        release.is_flexible
                                                    }
                                                    onChange={(event) =>
                                                        updateRelease(
                                                            index,
                                                            'tolerance_minutes',
                                                            Number(
                                                                event.target
                                                                    .value,
                                                            ),
                                                        )
                                                    }
                                                    className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-500"
                                                />
                                            </div>

                                            {/* HAPUS */}
                                            <div className="flex items-end">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        removeRelease(index)
                                                    }
                                                    disabled={
                                                        releases.length <= 1
                                                    }
                                                    className="flex h-11 w-full items-center justify-center rounded-xl border border-red-200 bg-white text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 lg:w-11"
                                                    title="Hapus slot"
                                                >
                                                    <Trash2 size={17} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* FLEXIBLE */}
                                        <div className="mt-4 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                                            <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                                                <input
                                                    type="checkbox"
                                                    checked={
                                                        release.is_flexible
                                                    }
                                                    disabled={
                                                        release.type !==
                                                        'toilet'
                                                    }
                                                    onChange={(event) =>
                                                        updateRelease(
                                                            index,
                                                            'is_flexible',
                                                            event.target
                                                                .checked,
                                                        )
                                                    }
                                                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                />

                                                <span>
                                                    Toilet dapat diambil
                                                    flexible
                                                </span>
                                            </label>

                                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                                <Clock3 size={15} />

                                                {release.is_flexible
                                                    ? 'Waktu flexible'
                                                    : `Release: ${
                                                          release.scheduled_start ||
                                                          '--:--'
                                                      } → ${
                                                          release.scheduled_end ||
                                                          '--:--'
                                                      }`}

                                                {!release.is_flexible && (
                                                    <span className="text-xs text-slate-400">
                                                        (
                                                        {
                                                            release.duration_minutes
                                                        }{' '}
                                                        menit)
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="mt-2 text-xs text-slate-400">
                                            {getTypeLabel(release.type)}
                                            {' • '}
                                            Toleransi{' '}
                                            {release.is_flexible
                                                ? 0
                                                : release.tolerance_minutes}{' '}
                                            menit
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* TOTAL */}
                            <div className="mt-6 rounded-2xl bg-slate-900 p-5 text-white">
                                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <div className="text-xs font-semibold tracking-wide text-slate-400 uppercase">
                                            Total Release
                                        </div>

                                        <p className="mt-1 text-sm text-slate-300">
                                            Hak release CSO adalah{' '}
                                            <span className="font-semibold text-white">
                                                75 menit terjadwal + 15 menit
                                                Toilet flexible
                                            </span>
                                            .
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-6">
                                        <div>
                                            <div className="text-xs text-slate-400">
                                                Terjadwal tetap
                                            </div>

                                            <div className="text-2xl font-bold">
                                                {fixedMinutes}{' '}
                                                <span className="text-sm font-normal text-slate-400">
                                                    menit terjadwal
                                                </span>
                                            </div>
                                        </div>

                                        <div className="h-10 w-px bg-slate-700" />

                                        <div>
                                            <div className="text-xs text-slate-400">
                                                Sisa
                                            </div>

                                            <div
                                                className={`text-2xl font-bold ${
                                                    remainingFixedMinutes > 0
                                                        ? 'text-yellow-400'
                                                        : 'text-green-400'
                                                }`}
                                            >
                                                {remainingFixedMinutes}{' '}
                                                <span className="text-sm font-normal text-slate-400">
                                                    menit
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {remainingFixedMinutes > 0 && (
                                    <div className="mt-4 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-300">
                                        Masih ada{' '}
                                        <strong className="text-yellow-400">
                                            {remainingFixedMinutes} menit
                                        </strong>{' '}
                                        release yang belum dijadwalkan.
                                    </div>
                                )}

                                {excessFixedMinutes > 0 && (
                                    <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                                        Jadwal tetap melebihi standar 75 menit
                                        sebesar{' '}
                                        <strong>
                                            {excessFixedMinutes} menit
                                        </strong>
                                        .
                                    </div>
                                )}
                            </div>

                            <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">
                                Toilet flexible:{' '}
                                <strong>{flexibleMinutes} menit</strong>
                                {flexibleToiletCount === 0
                                    ? ' — belum ditambahkan.'
                                    : ' — slot flexible aktif.'}
                                <span className="ml-1 text-sky-600">
                                    Hak maksimal 15 menit.
                                </span>
                            </div>

                            {/* ERROR */}
                            {errorMessage && (
                                <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                    {errorMessage}
                                </div>
                            )}

                            {/* BUTTON */}
                            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                                <Link
                                    href="/release-schedule"
                                    className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                                >
                                    Batal
                                </Link>

                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="inline-flex h-11 items-center justify-center rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {processing
                                        ? 'Menyimpan...'
                                        : 'Simpan Perubahan'}
                                </button>
                            </div>
                        </section>
                    </form>
                </div>
            </div>
        </>
    );
}
