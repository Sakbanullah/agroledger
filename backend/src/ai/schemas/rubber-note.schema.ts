export const rubberNoteSchema = {
  type: 'object',

  properties: {
    workers: {
      type: 'array',

      description:
        'Daftar pekerja yang ditemukan pada catatan penjualan karet.',

      items: {
        type: 'object',

        properties: {
          name: {
            type: ['string', 'null'],
            description:
              'Nama pekerja seperti yang terbaca pada catatan. Gunakan null jika tidak dapat dibaca dengan cukup yakin.',
          },

          pieces: {
            type: ['integer', 'null'],
            description:
              'Jumlah keping/bongkah karet milik pekerja. Gunakan null jika tidak dapat dibaca dengan cukup yakin.',
          },

          weightKg: {
            type: ['number', 'null'],
            description:
              'Berat karet pekerja dalam kilogram. Gunakan null jika tidak dapat dibaca dengan cukup yakin.',
          },
        },

        required: [
          'name',
          'pieces',
          'weightKg',
        ],
      },
    },
  },

  required: ['workers'],
};