/**
 * Booking Widget - The Cabins at Country Road
 * Uses Pikaday for date picking, submits to Eviivo booking engine
 */
document.addEventListener('DOMContentLoaded', function () {
  var EVIIVO_BASE = 'https://book.thecabinsatcountryroad.com';

  // Initialize all booking widgets on the page
  document.querySelectorAll('.booking-widget').forEach(function (widget) {
    initBookingWidget(widget);
  });

  // Initialize all sidebar booking widgets
  document.querySelectorAll('.booking-sidebar-widget').forEach(function (widget) {
    initSidebarWidget(widget);
  });

  function initBookingWidget(widget) {
    var checkinInput = widget.querySelector('.bw-checkin');
    var checkoutInput = widget.querySelector('.bw-checkout');
    var guestsSelect = widget.querySelector('.bw-guests');
    var form = widget.querySelector('form');

    var today = new Date();
    var tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    var dayAfter = new Date(today);
    dayAfter.setDate(dayAfter.getDate() + 2);

    var checkinPicker = new Pikaday({
      field: checkinInput,
      format: 'MMM D, YYYY',
      minDate: today,
      defaultDate: tomorrow,
      setDefaultDate: true,
      onSelect: function () {
        var selected = checkinPicker.getDate();
        var nextDay = new Date(selected);
        nextDay.setDate(nextDay.getDate() + 1);
        checkoutPicker.setMinDate(nextDay);
        if (checkoutPicker.getDate() <= selected) {
          checkoutPicker.setDate(nextDay);
        }
      },
      i18n: {
        previousMonth: 'Previous',
        nextMonth: 'Next',
        months: ['January','February','March','April','May','June','July','August','September','October','November','December'],
        weekdays: ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
        weekdaysShort: ['Su','Mo','Tu','We','Th','Fr','Sa']
      }
    });

    var checkoutPicker = new Pikaday({
      field: checkoutInput,
      format: 'MMM D, YYYY',
      minDate: dayAfter,
      defaultDate: dayAfter,
      setDefaultDate: true,
      i18n: {
        previousMonth: 'Previous',
        nextMonth: 'Next',
        months: ['January','February','March','April','May','June','July','August','September','October','November','December'],
        weekdays: ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
        weekdaysShort: ['Su','Mo','Tu','We','Th','Fr','Sa']
      }
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var checkin = checkinPicker.getDate();
      var checkout = checkoutPicker.getDate();
      var guests = guestsSelect ? guestsSelect.value : '2';

      var startdate = formatDate(checkin);
      var enddate = formatDate(checkout);

      var url = EVIIVO_BASE + '?startdate=' + startdate + '&enddate=' + enddate + '&adults1=' + guests + '&children1=0';
      window.open(url, '_blank');
    });
  }

  function initSidebarWidget(widget) {
    var checkinInput = widget.querySelector('.bw-checkin');
    var checkoutInput = widget.querySelector('.bw-checkout');
    var form = widget.querySelector('form');

    var today = new Date();
    var tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    var dayAfter = new Date(today);
    dayAfter.setDate(dayAfter.getDate() + 2);

    var checkinPicker = new Pikaday({
      field: checkinInput,
      format: 'MMM D, YYYY',
      minDate: today,
      defaultDate: tomorrow,
      setDefaultDate: true,
      onSelect: function () {
        var selected = checkinPicker.getDate();
        var nextDay = new Date(selected);
        nextDay.setDate(nextDay.getDate() + 1);
        checkoutPicker.setMinDate(nextDay);
        if (checkoutPicker.getDate() <= selected) {
          checkoutPicker.setDate(nextDay);
        }
      },
      i18n: {
        previousMonth: 'Previous',
        nextMonth: 'Next',
        months: ['January','February','March','April','May','June','July','August','September','October','November','December'],
        weekdays: ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
        weekdaysShort: ['Su','Mo','Tu','We','Th','Fr','Sa']
      }
    });

    var checkoutPicker = new Pikaday({
      field: checkoutInput,
      format: 'MMM D, YYYY',
      minDate: dayAfter,
      defaultDate: dayAfter,
      setDefaultDate: true,
      i18n: {
        previousMonth: 'Previous',
        nextMonth: 'Next',
        months: ['January','February','March','April','May','June','July','August','September','October','November','December'],
        weekdays: ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
        weekdaysShort: ['Su','Mo','Tu','We','Th','Fr','Sa']
      }
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var checkin = checkinPicker.getDate();
      var checkout = checkoutPicker.getDate();

      var startdate = formatDate(checkin);
      var enddate = formatDate(checkout);

      var url = EVIIVO_BASE + '?startdate=' + startdate + '&enddate=' + enddate + '&adults1=2&children1=0';
      window.open(url, '_blank');
    });
  }

  function formatDate(date) {
    var y = date.getFullYear();
    var m = ('0' + (date.getMonth() + 1)).slice(-2);
    var d = ('0' + date.getDate()).slice(-2);
    return y + '-' + m + '-' + d;
  }
});
