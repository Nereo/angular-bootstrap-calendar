'use strict';

var angular = require('angular');
var _ = require('lodash');

angular
  .module('mwl.calendar')
  .controller('MwlCalendarMonthsCarouselCtrl', function($scope, $window, moment, calendarHelper, calendarConfig, calendarEventTitle) {

    var vm = this;
    vm.calendarConfig = calendarConfig;
    vm.calendarEventTitle = calendarEventTitle;
    vm.openRowIndex = null;
    vm.defaultMonthsToShow = vm.monthsToShow;

    function toggleCell() {
      vm.openRowIndex = null;
      vm.openDayIndex = null;

      if (vm.cellIsOpen && vm.months) {
        vm.months.forEach(function(month, monthIndex) {
          month.days.forEach(function(day, dayIndex) {
            if (moment(vm.viewDate).startOf('day').isSame(day.date)) {
              vm.openDayIndex = (monthIndex, dayIndex);
              vm.openRowIndex = (monthIndex, Math.floor(dayIndex / 7));
            }
          });
        });
      }
    }

    $scope.$on('calendar.refreshView', function() {
      vm.checkResponsive(vm.carouselContainer.offsetWidth);

      vm.weekDays = calendarHelper.getWeekDayNames();

      var monthView = calendarHelper.getMonthsCarouselView(vm.events, vm.viewDate, vm.monthsToShow, vm.cellModifier);
      vm.months = monthView.months;

      if (vm.cellAutoOpenDisabled) {
        toggleCell();
      } else if (!vm.cellAutoOpenDisabled && vm.cellIsOpen && vm.openRowIndex === null) {
        //Auto open the calendar to the current day if set
        vm.openDayIndex = null;
        vm.months.forEach(function(month, monthIndex) {
          month.days.forEach(function(day) {
            if (day.inMonth && moment(vm.viewDate).startOf('day').isSame(day.date)) {
              vm.dayClicked(day, monthIndex, true);
            }
          });
        });
      }

    });

    if (vm.cellAutoOpenDisabled) {
      $scope.$watchGroup([
        'vm.cellIsOpen',
        'vm.viewDate',
      ], toggleCell);
    }

    vm.isMorningOnly = function(day, event) {
      return event.afternoonIncluded === false && moment(event.endsAt).isSame(day.date, 'day');
    };

    vm.isAfternoonOnly = function(day, event) {
      return event.morningIncluded === false && moment(event.startsAt).isSame(day.date, 'day');
    };

    vm.dayClicked = function(day, currentMonthIndex, dayClickedFirstRun, $event) {

      if (vm.onDayClick && day.inMonth) {
        $event.stopPropagation();
        if (day.events.length > 0) {
          vm.onEventClick({calendarEvent: day.events});
        } else {
          vm.onDayClick({day: day});
        }
        return;
      }

      if (!dayClickedFirstRun) {
        vm.onTimespanClick({
          calendarDate: day.date.toDate(),
          calendarCell: day,
          $event: $event
        });
        if ($event && $event.defaultPrevented) {
          return;
        }
      }

      if (!vm.cellAutoOpenDisabled) {
        vm.openRowIndex = null;
        var currentDayIndex = vm.months[currentMonthIndex].days.indexOf(day);
        if (vm.openDayIndex && currentMonthIndex === vm.openDayIndex[0] && currentDayIndex === vm.openDayIndex[1]) {
          vm.openDayIndex = null; //close the open day
          vm.cellIsOpen = false;
        } else {
          vm.openDayIndex = (currentMonthIndex, currentDayIndex);
          vm.openRowIndex = Math.floor(currentDayIndex / 7);
          vm.cellIsOpen = true;
        }
      }

    };

    vm.handleEventDrop = function(event, newDayDate, draggedFromDate) {

      var newStart = moment(event.startsAt)
        .date(moment(newDayDate).date())
        .month(moment(newDayDate).month())
        .year(moment(newDayDate).year());

      var newEnd = calendarHelper.adjustEndDateFromStartDiff(event.startsAt, newStart, event.endsAt);

      vm.onEventTimesChanged({
        calendarEvent: event,
        calendarDate: newDayDate,
        calendarNewEventStart: newStart.toDate(),
        calendarNewEventEnd: newEnd ? newEnd.toDate() : null,
        calendarDraggedFromDate: draggedFromDate
      });
    };

    vm.onDragSelectStart = function(day) {
      if (!vm.dateRangeSelect) {
        vm.dateRangeSelect = {
          startDate: day.date,
          endDate: day.date
        };
      }
    };

    vm.onDragSelectMove = function(day) {
      if (vm.dateRangeSelect) {
        vm.dateRangeSelect.endDate = day.date;
      }
    };

    vm.onDragSelectEnd = function(day) {
      vm.dateRangeSelect.endDate = day.date;
      if (vm.dateRangeSelect.endDate > vm.dateRangeSelect.startDate) {
        vm.onDateRangeSelect({
          calendarRangeStartDate: vm.dateRangeSelect.startDate.clone().startOf('day').toDate(),
          calendarRangeEndDate: vm.dateRangeSelect.endDate.clone().endOf('day').toDate()
        });
      }
      delete vm.dateRangeSelect;
    };

    vm.checkResponsive = function(currentWidth) {
      var newMonthsToShow = vm.defaultMonthsToShow;
      vm.responsive.forEach(function(breakpoint) {
        if (currentWidth < breakpoint.breakpoint) {
          newMonthsToShow = breakpoint.monthsToShow;
        }
      });
      vm.monthsToShow = newMonthsToShow;
    };

    angular.element($window).on('resize', _.debounce(function() {
      $scope.$broadcast('calendar.refreshView');
    }, 100));
  })
  .directive('mwlCalendarMonthsCarousel', function() {

    return {
      template: '<div mwl-dynamic-directive-template name="calendarMonthsCarouselView" overrides="vm.customTemplateUrls"></div>',
      restrict: 'E',
      require: '^mwlCalendar',
      scope: {
        events: '=',
        viewDate: '=',
        monthsToShow: '=',
        responsive: '=',
        onDayClick: '=',
        onEventClick: '=',
        onEventTimesChanged: '=',
        onDateRangeSelect: '=',
        cellIsOpen: '=',
        cellAutoOpenDisabled: '=',
        onTimespanClick: '=',
        cellModifier: '=',
        slideBoxDisabled: '=',
        customTemplateUrls: '=?',
        templateScope: '=',
      },
      controller: 'MwlCalendarMonthsCarouselCtrl as vm',
      link: function(scope, element, attrs, calendarCtrl) {
        scope.vm.calendarCtrl = calendarCtrl;
        scope.vm.carouselContainer = element.find('div')[0];
      },
      bindToController: true
    };

  });
