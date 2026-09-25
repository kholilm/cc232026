import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { useMemo } from 'react';
import type { FormEvent } from 'react';

type ReleaseType = 'meal' | 'meal_dzuhur' | 'toilet';

interface ReleaseRow {
    type: ReleaseType;
    scheduled_start: string;
    scheduled_end: string;
    duration_minutes: number;
    is_flexible: boolean;
    tolerance_minutes: number;
}

interface ScheduleForm {
    agent_name: string;
    shift: string;
    date: string;
    releases: ReleaseRow[];
}

const SHIFTS = ['X', 'A', 'B', 'C', 'E', 'F', 'H', 'J', 'P', 'R'];

const STANDARD_RELEASE = 90;

function getToday(): string {
    const date = new Date();

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

function calculateEndTime(start: string, duration: number): string {
    if (!start || duration <= 0) {
        return '';
    }

    const parts = start.split(':');

    if (parts.length !== 2) {
        return '';
    }

    const hours = Number(parts[0]);
    const minutes = Number(parts[1]);

    if (Number.isNaN(hours) || Number.isNaN(minutes)) {
        return '';
    }

    let totalMinutes = hours * 60 + minutes + duration;

    totalMinutes = totalMinutes % (24 * 60);

    const endHours = Math.floor(totalMinutes / 60);

    const endMinutes = totalMinutes % 60;

    return (
        String(endHours).padStart(2, '0') +
        ':' +
        String(endMinutes).padStart(2, '0')
    );
}

function createRelease(): ReleaseRow {
    return {
        type: 'meal',
        scheduled_start: '',
        scheduled_end: '',
        duration_minutes: 15,
        is_flexible: false,
        tolerance_minutes: 10,
    };
}

export default function ScheduleCreate() {
    const { data, setData, post, processing, errors } = useForm<ScheduleForm>({
        agent_name: '',
        shift: '',
        date: getToday(),
        releases: [createRelease()],
    });

    const totalRelease = useMemo(() => {
        return data.releases.reduce((total, release) => {
            return total + Number(release.duration_minutes || 0);
        }, 0);
    }, [data.releases]);

    const remainingRelease = Math.max(STANDARD_RELEASE - totalRelease, 0);

    const extraRelease = Math.max(totalRelease - STANDARD_RELEASE, 0);

    const updateRelease = (
        index: number,
        field: keyof ReleaseRow,
        value: string | number | boolean,
    ) => {
        const releases = [...data.releases];

        const release = {
            ...releases[index],
        };

        if (field === 'type') {
            const type = value as ReleaseType;

            release.type = type;

            if (type === 'toilet') {
                release.is_flexible = true;
                release.scheduled_start = '';
                release.scheduled_end = '';
                release.tolerance_minutes = 0;

                if (
                    !release.duration_minutes ||
                    release.duration_minutes <= 0
                ) {
                    release.duration_minutes = 15;
                }
            } else {
                release.is_flexible = false;

                if (
                    !release.duration_minutes ||
                    release.duration_minutes <= 0
                ) {
                    release.duration_minutes = type === 'meal_dzuhur' ? 30 : 15;
                }

                release.scheduled_end = calculateEndTime(
                    release.scheduled_start,
                    release.duration_minutes,
                );
            }
        }

        if (field === 'scheduled_start') {
            release.scheduled_start = String(value);

            release.scheduled_end = calculateEndTime(
                release.scheduled_start,
                Number(release.duration_minutes),
            );
        }

        if (field === 'duration_minutes') {
            release.duration_minutes = Number(value);

            release.scheduled_end = calculateEndTime(
                release.scheduled_start,
                release.duration_minutes,
            );
        }

        if (field === 'tolerance_minutes') {
            release.tolerance_minutes = Number(value);
        }

        if (field === 'is_flexible') {
            release.is_flexible = Boolean(value);
        }

        releases[index] = release;

        setData('releases', releases);
    };

    const addRelease = () => {
        setData('releases', [...data.releases, createRelease()]);
    };

    const removeRelease = (index: number) => {
        if (data.releases.length === 1) {
            return;
        }

        setData(
            'releases',
            data.releases.filter((_, itemIndex) => itemIndex !== index),
        );
    };

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();

        post('/release-schedule');
    };

    return (
        <>
            <Head title="Tambah Release Schedule" />

            <div className="min-h-screen bg-slate-50 p-6">
                <div className="mx-auto max-w-6xl">
                    {/* HEADER */}
                    <div className="mb-6 flex items-center gap-4">
                        <Link
                            href="/release-schedule"
                            className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 hover:bg-slate-100"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Link>

                        <div>
                            <h1 className="text-2xl font-bold text-slate-800">
                                Tambah Release Schedule
                            </h1>

                            <p className="mt-1 text-sm text-slate-500">
                                Buat seluruh jadwal release untuk satu CSO.
                            </p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit}>
                        {/* INFORMASI CSO */}
                        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                            <h2 className="mb-5 text-sm font-bold tracking-wide text-slate-800 uppercase">
                                Informasi CSO
                            </h2>

                            <div className="grid gap-5 md:grid-cols-3">
                                {/* NAMA */}
                                <div>
                                    <label className="mb-1.5 block text-sm font-semibold text-slate-800">
                                        Nama CSO
                                    </label>

                                    <input
                                        type="text"
                                        value={data.agent_name}
                                        onChange={(event) =>
                                            setData(
                                                'agent_name',
                                                event.target.value,
                                            )
                                        }
                                        placeholder="CC.23.NURHALIZAH"
                                        className="h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-900 transition outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                    />

                                    {errors.agent_name && (
                                        <p className="mt-1 text-xs text-red-600">
                                            {errors.agent_name}
                                        </p>
                                    )}
                                </div>

                                {/* SHIFT */}
                                <div>
                                    <label className="mb-1.5 block text-sm font-semibold text-slate-800">
                                        Shift
                                    </label>

                                    <select
                                        value={data.shift}
                                        onChange={(event) =>
                                            setData('shift', event.target.value)
                                        }
                                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                    >
                                        <option
                                            value=""
                                            className="text-slate-500"
                                        >
                                            Pilih Shift
                                        </option>

                                        {SHIFTS.map((shift) => (
                                            <option
                                                key={shift}
                                                value={shift}
                                                className="text-slate-900"
                                            >
                                                Shift {shift}
                                            </option>
                                        ))}
                                    </select>

                                    <p className="mt-1 text-[11px] text-slate-500">
                                        Shift dapat berubah sesuai jadwal kerja.
                                    </p>

                                    {errors.shift && (
                                        <p className="mt-1 text-xs text-red-600">
                                            {errors.shift}
                                        </p>
                                    )}
                                </div>

                                {/* TANGGAL */}
                                <div>
                                    <label className="mb-1.5 block text-sm font-semibold text-slate-800">
                                        Tanggal
                                    </label>

                                    <input
                                        type="date"
                                        value={data.date}
                                        onChange={(event) =>
                                            setData('date', event.target.value)
                                        }
                                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                    />

                                    {errors.date && (
                                        <p className="mt-1 text-xs text-red-600">
                                            {errors.date}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </section>

                        {/* JADWAL RELEASE */}
                        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                            {/* TITLE */}
                            <div className="mb-5 flex items-center justify-between">
                                <div>
                                    <h2 className="text-sm font-bold tracking-wide text-slate-800 uppercase">
                                        Jadwal Release
                                    </h2>

                                    <p className="mt-1 text-xs text-slate-500">
                                        Tambahkan seluruh slot makan, sholat,
                                        dan toilet.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={addRelease}
                                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                                >
                                    <Plus className="h-4 w-4" />
                                    Tambah Slot
                                </button>
                            </div>

                            {/* RELEASE LIST */}
                            <div className="space-y-4">
                                {data.releases.map((release, index) => (
                                    <div
                                        key={index}
                                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                                    >
                                        <div className="grid gap-4 lg:grid-cols-6">
                                            {/* JENIS */}
                                            <div className="lg:col-span-2">
                                                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
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
                                                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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
                                                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                                                    Mulai
                                                </label>

                                                <input
                                                    type="time"
                                                    value={
                                                        release.scheduled_start
                                                    }
                                                    disabled={
                                                        release.is_flexible
                                                    }
                                                    onChange={(event) =>
                                                        updateRelease(
                                                            index,
                                                            'scheduled_start',
                                                            event.target.value,
                                                        )
                                                    }
                                                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-500"
                                                />
                                            </div>

                                            {/* SELESAI */}
                                            <div>
                                                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                                                    Selesai
                                                </label>

                                                <input
                                                    type="time"
                                                    value={
                                                        release.scheduled_end
                                                    }
                                                    readOnly
                                                    disabled={
                                                        release.is_flexible
                                                    }
                                                    className="w-full rounded-xl border border-slate-300 bg-slate-100 px-3 py-2.5 text-sm font-semibold text-slate-800 disabled:text-slate-500"
                                                />

                                                {!release.is_flexible && (
                                                    <p className="mt-1 text-[10px] text-slate-500">
                                                        Otomatis
                                                    </p>
                                                )}
                                            </div>

                                            {/* DURASI */}
                                            <div>
                                                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
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
                                                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                                />

                                                <p className="mt-1 text-[10px] text-slate-500">
                                                    Contoh 10 / 15 / 30 / 50
                                                </p>
                                            </div>

                                            {/* TOLERANSI */}
                                            <div className="relative">
                                                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                                                    Toleransi
                                                </label>

                                                <div className="flex gap-2">
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
                                                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-500"
                                                    />

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            removeRelease(index)
                                                        }
                                                        disabled={
                                                            data.releases
                                                                .length === 1
                                                        }
                                                        title="Hapus slot"
                                                        className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-30"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* FLEXIBLE TOILET */}
                                        {release.is_flexible && (
                                            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
                                                <strong>
                                                    Toilet fleksibel.
                                                </strong>{' '}
                                                Tidak membutuhkan jam mulai dan
                                                jam selesai. Durasi tetap
                                                dihitung ke total release.
                                            </div>
                                        )}

                                        {/* PREVIEW */}
                                        {!release.is_flexible &&
                                            release.scheduled_start &&
                                            release.scheduled_end && (
                                                <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
                                                    <span className="text-xs text-slate-500">
                                                        Release
                                                    </span>

                                                    <strong className="text-sm text-slate-800">
                                                        {
                                                            release.scheduled_start
                                                        }{' '}
                                                        →{' '}
                                                        {release.scheduled_end}
                                                    </strong>
                                                </div>
                                            )}
                                    </div>
                                ))}
                            </div>

                            {/* TOTAL */}
                            <div className="mt-6 rounded-2xl bg-slate-900 p-5 text-white">
                                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">
                                            Total Release
                                        </p>

                                        <p className="mt-1 text-sm text-slate-300">
                                            Standar release CSO adalah{' '}
                                            <strong className="text-white">
                                                90 menit
                                            </strong>
                                            .
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-6">
                                        <div>
                                            <p className="text-xs text-slate-400">
                                                Terjadwal
                                            </p>

                                            <p className="text-2xl font-bold">
                                                {totalRelease}
                                                <span className="ml-1 text-sm font-normal text-slate-400">
                                                    menit
                                                </span>
                                            </p>
                                        </div>

                                        <div className="h-10 w-px bg-slate-700" />

                                        <div>
                                            <p className="text-xs text-slate-400">
                                                Sisa
                                            </p>

                                            <p
                                                className={`text-2xl font-bold ${
                                                    remainingRelease === 0
                                                        ? 'text-emerald-400'
                                                        : 'text-amber-400'
                                                }`}
                                            >
                                                {remainingRelease}
                                                <span className="ml-1 text-sm font-normal text-slate-400">
                                                    menit
                                                </span>
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-5 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3">
                                    {totalRelease === 0 && (
                                        <p className="text-xs text-slate-300">
                                            Belum ada release yang dijadwalkan.
                                        </p>
                                    )}

                                    {totalRelease > 0 &&
                                        totalRelease < STANDARD_RELEASE && (
                                            <p className="text-xs text-slate-300">
                                                Masih ada{' '}
                                                <strong className="text-amber-400">
                                                    {remainingRelease} menit
                                                </strong>{' '}
                                                release yang belum dijadwalkan.
                                            </p>
                                        )}

                                    {totalRelease === STANDARD_RELEASE && (
                                        <p className="text-xs text-emerald-300">
                                            Total release sudah tepat 90 menit.
                                        </p>
                                    )}

                                    {totalRelease > STANDARD_RELEASE && (
                                        <p className="text-xs text-red-300">
                                            Total release melebihi standar
                                            sebanyak{' '}
                                            <strong>
                                                {extraRelease} menit
                                            </strong>
                                            .
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* BUTTON */}
                            <div className="mt-6 flex justify-end gap-3">
                                <Link
                                    href="/release-schedule"
                                    className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                                >
                                    Batal
                                </Link>

                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {processing
                                        ? 'Menyimpan...'
                                        : 'Simpan Jadwal'}
                                </button>
                            </div>
                        </section>
                    </form>
                </div>
            </div>
        </>
    );
}
