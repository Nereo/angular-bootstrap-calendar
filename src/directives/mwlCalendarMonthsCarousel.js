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

      if (vm.cellIsOpen && vm.view) {
        vm.view.forEach(function(day, dayIndex) {
          if (moment(vm.viewDate).startOf('day').isSame(day.date)) {
            vm.openDayIndex = dayIndex;
            vm.openRowIndex = Math.floor(dayIndex / 7);
          }
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
        vm.months.forEach(function(month) {
          month.days.forEach(function(day) {
            if (day.inMonth && moment(vm.viewDate).startOf('day').isSame(day.date)) {
              vm.dayClicked(day, true);
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

    vm.dayClicked = function(day, dayClickedFirstRun, $event) {

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
        var dayIndex = vm.view.indexOf(day);
        if (dayIndex === vm.openDayIndex) { //the day has been clicked and is already open
          vm.openDayIndex = null; //close the open day
          vm.cellIsOpen = false;
        } else {
          vm.openDayIndex = dayIndex;
          vm.openRowIndex = Math.floor(dayIndex / 7);
          vm.cellIsOpen = true;
        }
      }

    };

    vm.highlightEvent = function(event, shouldAddClass) {

      vm.months.forEach(function(month) {
        month.days.forEach(function(day) {
          delete day.highlightClass;
          delete day.backgroundColor;
          if (shouldAddClass) {
            var dayContainsEvent = day.events.indexOf(event) > -1;
            if (dayContainsEvent) {
              day.backgroundColor = event.color ? event.color.secondary : '';
            }
          }
        });
      });
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

    vm.getWeekNumberLabel = function(day) {
      var weekNumber = day.date.clone().add(1, 'day').isoWeek();
      if (typeof calendarConfig.i18nStrings.weekNumber === 'function') {
        return calendarConfig.i18nStrings.weekNumber({weekNumber: weekNumber});
      } else {
        return calendarConfig.i18nStrings.weekNumber.replace('{week}', weekNumber);
      }
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
