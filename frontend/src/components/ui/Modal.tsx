import { Fragment, type ReactNode } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useAccessibility } from '../../stores/useAccessibility';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: ReactNode;
    icon?: ReactNode;
}

export function Modal({ isOpen, onClose, title, children, icon }: ModalProps) {
    const { isDyslexic } = useAccessibility();

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-indigo-900/40 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className={`w-full max-w-md transform overflow-hidden rounded-[2.5rem] bg-white p-6 text-left align-middle shadow-xl transition-all border-4 border-indigo-50 ${isDyslexic ? 'font-dyslexic' : 'font-sans'}`}>
                                <div className="flex flex-col items-center justify-center text-center">
                                    {icon && (
                                        <div className="mb-4 text-5xl animate-bounce">
                                            {icon}
                                        </div>
                                    )}

                                    {title && (
                                        <Dialog.Title
                                            as="h3"
                                            className="text-2xl font-black leading-6 text-gray-900 mb-2"
                                        >
                                            {title}
                                        </Dialog.Title>
                                    )}

                                    <div className="mt-2 w-full">
                                        {children}
                                    </div>

                                    <div className="mt-8">
                                        <button
                                            type="button"
                                            className="inline-flex justify-center rounded-2xl border border-transparent bg-indigo-600 px-8 py-3 text-lg font-bold text-white hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 active:scale-95 transition-all shadow-lg shadow-indigo-100"
                                            onClick={onClose}
                                        >
                                            Génial !
                                        </button>
                                    </div>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
