const bookingHandler = {
    // apiUrl: 'https://encore-music-studio.herokuapp.com',
    apiUrl: 'http://localhost:3001',
    availability: [],
    bookings: [],
    currentBooking: {},
    addedBooking: {},
    dataLoading: false,
    calendar: null,
    emailCreds: {},
    async init() {
        if (this.dataLoading) return;
        $('#loader').show();
        const dataLoaded = await this.loadData();
        emailjs.init(this.emailCreds.user);
        this.dataLoading = false;
        if (dataLoaded) {
            $('#calendar').show();
            $('#calBtn').hide();
            this.loadCalendar();
        }
        $('#loader').hide();
    },
    async loadData() {
        this.dataLoading = true;
        try {
            await this.getAvailability();
            const emailCreds = await fetch(`${this.apiUrl}/email`);
            this.emailCreds = await emailCreds.json();
            await this.getBooking();
            return true;
        } catch {
            return false;
        }
    },
    async getAvailability() {
        try {
            const availabilityRaw = await fetch(`${this.apiUrl}/availability`);
            const avObj = await availabilityRaw.json();
            for (let dayName of Object.keys(avObj)) {
                const day = avObj[dayName];
                this.availability.push({
                    dayIndex: this.dayNameToDay(dayName),
                    dayName,
                    openings: day,
                });
            }
            return true;
        } catch {
            return false;
        }
    },
    async getBooking() {
        try {
            const bookingsRaw = await fetch(`${this.apiUrl}/bookings`);
            const bookingsObj = await bookingsRaw.json();
            this.bookings = bookingsObj.filter(b => b.name);
            return true;
        } catch {
            return false;
        }
    },
    async newBooking() {
        if (!this.currentBooking.name || !this.currentBooking.time)
            return false;
        $('#loader').show();
        try {
            const bookingRaw = await fetch(`${this.apiUrl}/bookings/new`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.currentBooking),
            });
            this.addedBooking = await bookingRaw.json();
            if (this.addedBooking.id) this.sendEmail();
            else $('#loader').hide();
            this.currentBooking = {};
            return true;
        } catch {
            return false;
        }
    },
    async sendEmail() {
        this.bookings.push({ ...this.addedBooking });
        $('#booking-message').modal('show');
        $('#booking-message > .content > p').html(
            `You're booked for ${this.addedBooking.date}, ${
                this.addedBooking.day
            } at ${this.addedBooking.time}. ${
                this.addedBooking.email
                    ? `The email you provided was ${this.addedBooking.email}. You should receive these details in an email shortly.`
                    : 'You did not provide an email. It is strongly suggested adding the booking information to your personal notes.'
            }`
        );

        try {
            emailjs.send(
                this.emailCreds.service,
                this.emailCreds.template,
                {
                    ...this.addedBooking,
                },
                this.emailCreds.user
            );

            if (this.addedBooking.email && this.emailCreds.template2) {
                emailjs.send(
                    this.emailCreds.service,
                    this.emailCreds.template2,
                    {
                        ...this.addedBooking,
                    },
                    this.emailCreds.user
                );
            }
        } catch (e) {
            console.warn(e);
        }
        $('#loader').hide();
    },
    dayNameToDay(dayName) {
        const days = [
            'Sunday',
            'Monday',
            'Tuesday',
            'Wednesday',
            'Thursday',
            'Friday',
            'Saturday',
        ];
        return days.findIndex(d => d === dayName);
    },
    loadCalendar() {
        const events = this.availability.map(a => {
            return {
                title: 'Piano Lessons',
                allDay: true, // will make tfhe time show
                daysOfWeek: [a.dayIndex],
                startRecur: new Date(Date.now()),
                // endRecur: new Date(new Date().setMonth(6, 1)),
            };
        });
        const calendarEl = document.getElementById('calendar');
        this.calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            events: events,
            height: '100%',
            eventClick: ({ event }) => {
                const dateObj = new Date(event.start);
                const date = dateObj.toLocaleDateString('en-US');
                const weekDay = dateObj.toLocaleDateString('en-US', {
                    weekday: 'long',
                });
                const availability = this.availability.find(
                    d => d.dayName === weekDay
                );
                this.currentBooking = {
                    date,
                    day: weekDay,
                    openings: availability.openings,
                };
                $('#booking-form').modal('show');
                this.updateModal();
            },
        });
        this.calendar.render();
    },
    updateModal() {
        const { date, time, day, openings, name } = this.currentBooking;
        $('#modal-header').html(`Booking for ${day}, ${date} at ${time || ''}`);
        $('#modal-timeslots').html(`
            <label>Time Slot</label>
            
            ${openings.map(o => {
                let color = 'blue';
                if (o === time) color = 'green';
                const closed = !!this.bookings.find(
                    b => b.date === date && b.time === o
                );
                // console.log(closed);
                // if (closed) color = 'grey';
                return `
                <button ${
                    !closed
                        ? `onclick='bookingHandler.updateBookingTime(event)'`
                        : `disabled='true'`
                } style='margin-bottom: 4px;' type='button' class='ui button ${color}'>
                ${o}
                </button>`;
            })}
            
        `);
        $('#modal-name').val(name);
    },
    updateBookingTime(e) {
        this.currentBooking = {
            ...this.currentBooking,
            time: e.currentTarget.innerHTML.trim(),
        };
        this.updateModal();
    },
    updateBookingName(e) {
        this.currentBooking = {
            ...this.currentBooking,
            name: e.currentTarget.value,
        };
        this.updateModal();
    },
    updateBookingEmail(e) {
        this.currentBooking = {
            ...this.currentBooking,
            email: e.currentTarget.value,
        };
        this.updateModal();
    },
};

$('#calendar').hide();
$('#loader').hide();
