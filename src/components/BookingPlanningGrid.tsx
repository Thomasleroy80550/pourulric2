// ... existing code ...
                  {reservations
                    .filter(reservation => {
                      // Simplification du filtre: on se base uniquement sur krossbooking_room_id qui est l'identifiant fiable.
                      // La propriété property_name est déjà mappée à room_name dans krossbooking.ts.
                      const matches = reservation.krossbooking_room_id === room.room_id;
                      console.log(`DEBUG BookingPlanningGrid: Checking reservation ${reservation.id} (${reservation.guest_name}) - krossbooking_room_id: ${reservation.krossbooking_room_id} against user room ${room.room_name} (ID: ${room.room_id}). Matches: ${matches}`);
                      return matches;
                    })
                    .map((reservation) => {
                      const checkIn = isValid(parseISO(reservation.check_in_date)) ? parseISO(reservation.check_in_date) : null;
                      const checkOut = isValid(parseISO(reservation.check_out_date)) ? parseISO(reservation.check_out_date) : null;

                      if (!checkIn || !checkOut) {
                        console.warn(`DEBUG: Skipping reservation ${reservation.id} due to invalid dates: check_in_date=${reservation.check_in_date}, check_out_date=${reservation.check_out_date}`);
                        return null;
                      }

                      const monthStart = startOfMonth(currentMonth);
                      const monthEnd = endOfMonth(currentMonth);

                      const numberOfNights = differenceInDays(checkOut, checkIn);

                      const barStartDate = checkIn;
                      const barEndDate = checkOut; 

                      const visibleBarStart = max([barStartDate, monthStart]);
                      const visibleBarEnd = min([barEndDate, monthEnd]);

                      if (visibleBarStart > visibleBarEnd) {
                        return null;
                      }

                      const startIndex = daysInMonth.findIndex(d => isSameDay(d, visibleBarStart));
                      const endIndex = daysInMonth.findIndex(d => isSameDay(d, visibleBarEnd));

                      if (startIndex === -1 || endIndex === -1 || startIndex > endIndex) {
                        console.warn(`DEBUG: Reservation ${reservation.id} bar dates not found in current month's days array or invalid range. Visible bar range: ${format(visibleBarStart, 'yyyy-MM-dd')} to ${format(visibleBarEnd, 'yyyy-MM-dd')}. Start Index: ${startIndex}, End Index: ${endIndex}`);
                        return null;
                      }

                      let calculatedLeft: number;
                      let calculatedWidth: number;
                      const isSingleDayStay = numberOfNights === 0;

                      if (isSingleDayStay) {
                        calculatedLeft = propertyColumnWidth + (startIndex * dayCellWidth) + (dayCellWidth / 4);
                        calculatedWidth = dayCellWidth / 2;
                      } else {
                        calculatedLeft = propertyColumnWidth + (startIndex * dayCellWidth) + (dayCellWidth / 2);
                        calculatedWidth = (endIndex - startIndex) * dayCellWidth;
                      }

                      // Determine the effective channel key for color mapping
                      const isOwnerBlock = reservation.status === 'PROPRI' || reservation.status === 'PROP0';
                      const effectiveChannelKey = isOwnerBlock ? reservation.status : (reservation.channel_identifier || 'UNKNOWN');
                      const channelInfo = channelColors[effectiveChannelKey] || channelColors['UNKNOWN'];

                      const isArrivalDayVisible = isSameDay(checkIn, visibleBarStart);
                      const isDepartureDayVisible = isSameDay(checkOut, visibleBarEnd);
                      
                      const barClasses = cn(
                        `absolute h-9 flex items-center justify-center font-semibold overflow-hidden whitespace-nowrap ${channelInfo.bgColor} ${channelInfo.textColor} shadow-sm transition-opacity`,
                        !isOwnerBlock && 'cursor-pointer hover:opacity-90', // Only allow click if not an owner block
                        isMobile ? 'text-[0.6rem] px-0.5' : 'text-xs px-1',
                        {
                          'rounded-full': isSingleDayStay,
                          'rounded-l-full': isArrivalDayVisible && !isSingleDayStay,
                          'rounded-r-full': isDepartureDayVisible && !isSingleDayStay,
                        }
                      );

                      return (
                        <Tooltip key={reservation.id}>
                          <TooltipTrigger asChild>
                            <div
                              className={barClasses}
                              style={{
                                gridRow: `${3 + roomIndex}`,
                                left: `${calculatedLeft}px`,
                                width: `${calculatedWidth}px`,
                                height: '36px',
                                marginTop: '2px',
                                marginBottom: '2px',
                                zIndex: 5,
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                              }}
                              onClick={() => {
                                if (!isOwnerBlock) { // Only allow click if not an owner block
                                  handleReservationClick(reservation);
                                }
                              }}
                            >
                              {isArrivalDayVisible && !isSingleDayStay && <LogIn className={cn("h-4 w-4 flex-shrink-0", isMobile && "h-3 w-3")} />}
                              
                              {isSingleDayStay && <Sparkles className={cn("h-4 w-4 flex-shrink-0", isMobile && "h-3 w-3")} />}

                              <span className="flex-grow text-center px-1 truncate">
                                <span className="mr-1">{channelInfo.name.charAt(0).toUpperCase()}.</span>
                                <span className="mr-1">{numberOfNights}n</span>
                                <span className="mx-1">|</span>
                                <span className="truncate">{reservation.guest_name}</span>
                              </span>

                              {isDepartureDayVisible && !isSingleDayStay && <LogOut className={cn("h-4 w-4 flex-shrink-0", isMobile && "h-3 w-3")} />}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="p-2 text-sm">
                            <p className="font-bold">{reservation.guest_name}</p>
                            <p>Chambre: {reservation.property_name}</p>
                            <p>Du {format(checkIn, 'dd/MM/yyyy', { locale: fr })} au {format(checkOut, 'dd/MM/yyyy', { locale: fr })}</p>
                            <p>{numberOfNights} nuit(s)</p>
                            <p>Statut: {channelInfo.name}</p> {/* Display the descriptive name */}
                            <p>Montant: {reservation.amount}</p>
                            <p>Canal: {reservation.channel_identifier || 'N/A'}</p> {/* Show original channel if available */}
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
// ... existing code ...